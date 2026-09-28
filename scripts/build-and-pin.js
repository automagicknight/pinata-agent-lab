// build-and-pin.js
//
// For each file passed on the command line (or every file under ./payload
// if none is given), this script:
//   1. Uploads the file to Pinata (pinFileToIPFS) to obtain a real CID.
//   2. Builds a CVP-0.1 object: file_id3 (spatial/rule/relation vectors),
//      composite_key = SHA-512(canonical_json({cid, v1, v2, v3})).
//   3. Signs the composite_key with Ed25519 (PRIVATE_KEY from env).
//   4. Links it to the previous record via provenance.prev.
//   5. Records everything in the local SQLite ledger (db/trust_state.db).
//
// This script makes NO legal claims. It proves: content integrity (CID),
// signature authenticity, and chain continuity. Nothing more.
//
// Required environment variables:
//   PINATA_JWT            - Pinata API JWT (https://app.pinata.cloud/developers/api-keys)
//   ED25519_PRIVATE_KEY   - base64-encoded 64-byte Ed25519 secret key (see gen-keys.js)
//
// Usage:
//   node scripts/build-and-pin.js path/to/file1 [path/to/file2 ...]

import Database from 'better-sqlite3';
import canonicalize from 'canonicalize';
import nacl from 'tweetnacl';
import { createHash } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const config = JSON.parse(readFileSync(path.join(ROOT, 'agent.config.json'), 'utf8'));

const PINATA_JWT = process.env.PINATA_JWT;
const PRIVATE_KEY_B64 = process.env.ED25519_PRIVATE_KEY;

if (!PINATA_JWT) {
  console.error('ERROR: PINATA_JWT environment variable is not set.');
  process.exit(1);
}
if (!PRIVATE_KEY_B64) {
  console.error('ERROR: ED25519_PRIVATE_KEY environment variable is not set. Run `npm run gen-keys` first.');
  process.exit(1);
}

const secretKey = new Uint8Array(Buffer.from(PRIVATE_KEY_B64, 'base64'));
const publicKeyB64 = Buffer.from(secretKey.slice(32)).toString('base64');

const dbPath = path.join(ROOT, config.chain.db_path);
const db = new Database(dbPath);
db.exec(readFileSync(path.join(ROOT, 'db', 'schema.sql'), 'utf8'));

function getLatestRecord() {
  return db
    .prepare('SELECT * FROM trust_records ORDER BY seq DESC LIMIT 1')
    .get();
}

async function pinFileToPinata(filePath) {
  const fileBuffer = readFileSync(filePath);
  const fileName = path.basename(filePath);

  const form = new FormData();
  form.append('file', new Blob([fileBuffer]), fileName);
  form.append(
    'pinataMetadata',
    JSON.stringify({ name: fileName })
  );

  const resp = await fetch(`${config.storage.api_base}/pinning/pinFileToIPFS`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PINATA_JWT}` },
    body: form,
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Pinata upload failed (${resp.status}): ${text}`);
  }

  const result = await resp.json();
  return result.IpfsHash; // this is the CID
}

function buildFileId3(fileName, seq) {
  return {
    v1_spatial: {
      scheme: 'namespace',
      namespace: 'commons-vector',
      zone: 'backup',
      region: 'root',
      object: String(seq).padStart(4, '0'),
    },
    v2_rule: {
      dictionary: `cvp-core-dictionary-v1@${config.lexicon.canonical_cid}`,
      schema: 'cvp-object-schema-v0.1',
      governance: 'unilateral',
      jurisdiction_declared: 'private-trust',
    },
    v3_relation: {
      type: 'create',
      parent: null,
      classification: 'backup-record',
      role: 'artifact',
      lineage: [],
      file_name: fileName,
    },
  };
}

function computeCompositeKey(cid, fileId3) {
  const payload = {
    cid,
    v1_spatial: fileId3.v1_spatial,
    v2_rule: fileId3.v2_rule,
    v3_relation: fileId3.v3_relation,
  };
  const canonical = canonicalize(payload);
  const hash = createHash('sha512').update(canonical, 'utf8').digest('hex');
  return `1a20${hash}`; // self-describing prefix: alg=sha512-ish tag, not a real multihash varint — replace with a real multihash lib for production use
}

function signCompositeKey(compositeKey) {
  const messageBytes = new TextEncoder().encode(compositeKey);
  const signature = nacl.sign.detached(messageBytes, secretKey);
  return Buffer.from(signature).toString('base64');
}

async function processFile(filePath) {
  console.log(`\n--- Processing ${filePath} ---`);

  const cid = await pinFileToPinata(filePath);
  console.log(`Pinned. CID: ${cid}`);

  const latest = getLatestRecord();
  const seq = latest ? latest.seq + 1 : 0;
  const prev = latest ? latest.composite_key : 'GENESIS';

  const fileId3 = buildFileId3(path.basename(filePath), seq);
  const compositeKey = computeCompositeKey(cid, fileId3);
  const signature = signCompositeKey(compositeKey);
  const gatewayUrl = `${config.storage.gateway}${cid}`;

  db.prepare(
    `INSERT INTO trust_records
      (seq, cid, composite_key, prev_composite_key, event_type, spatial, rule_dictionary, signer_public_key, signature, gateway_url, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PINNED')`
  ).run(
    seq,
    cid,
    compositeKey,
    prev,
    'create',
    JSON.stringify(fileId3.v1_spatial),
    fileId3.v2_rule.dictionary,
    publicKeyB64,
    signature,
    gatewayUrl
  );

  console.log(`seq=${seq}  composite_key=${compositeKey}`);
  console.log(`prev=${prev}`);
  console.log(`gateway: ${gatewayUrl}`);

  return { seq, cid, compositeKey, prev, gatewayUrl };
}

async function main() {
  const files = process.argv.slice(2);
  const targets = files.length > 0 ? files : [];

  if (targets.length === 0) {
    console.error('No files given. Usage: node scripts/build-and-pin.js <file1> [file2 ...]');
    process.exit(1);
  }

  for (const f of targets) {
    if (!existsSync(f)) {
      console.error(`SKIP: file not found: ${f}`);
      continue;
    }
    await processFile(f);
  }

  db.close();
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
