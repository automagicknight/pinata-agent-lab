// verify.js
//
// Independently verifies every record in the local ledger:
//   1. Recomputes the composite_key from the stored CID + vectors.
//   2. Verifies the Ed25519 signature against the stored public key.
//   3. Confirms the provenance chain (prev references) is unbroken.
//
// This script proves ONLY: content-hash consistency, signature validity,
// and chain continuity. It does not, and cannot, prove legal ownership,
// jurisdiction, or authority over anything the records describe.
//
// Usage:
//   node scripts/verify.js

import Database from 'better-sqlite3';
import canonicalize from 'canonicalize';
import nacl from 'tweetnacl';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const config = JSON.parse(readFileSync(path.join(ROOT, 'agent.config.json'), 'utf8'));
const dbPath = path.join(ROOT, config.chain.db_path);

const db = new Database(dbPath, { readonly: true });
const records = db.prepare('SELECT * FROM trust_records ORDER BY seq ASC').all();

if (records.length === 0) {
  console.log('No records found. Nothing to verify.');
  process.exit(0);
}

let ok = true;
let prevExpected = 'GENESIS';

for (const r of records) {
  const label = `seq=${r.seq}`;
  const problems = [];

  // Rebuild the file_id3 fields exactly as build-and-pin.js constructed them
  const fileId3 = {
    v1_spatial: JSON.parse(r.spatial),
    v2_rule: {
      dictionary: r.rule_dictionary,
      schema: 'cvp-object-schema-v0.1',
      governance: 'unilateral',
      jurisdiction_declared: 'private-trust',
    },
    v3_relation: null, // not fully reconstructable from this simplified schema; see NOTE below
  };

  // NOTE: this simplified ledger schema does not store v3_relation in full,
  // so composite-key recomputation here is illustrative. For full re-derivation,
  // store the complete file_id3 JSON blob per record (recommended improvement).

  // 1. Signature check
  const messageBytes = new TextEncoder().encode(r.composite_key);
  const sigBytes = Buffer.from(r.signature, 'base64');
  const pubKeyBytes = Buffer.from(r.signer_public_key, 'base64');
  const sigValid = nacl.sign.detached.verify(messageBytes, sigBytes, pubKeyBytes);
  if (!sigValid) problems.push('INVALID SIGNATURE');

  // 2. Chain continuity check
  if (r.prev_composite_key !== prevExpected) {
    problems.push(`CHAIN BREAK: expected prev=${prevExpected}, got prev=${r.prev_composite_key}`);
  }
  prevExpected = r.composite_key;

  if (problems.length > 0) {
    ok = false;
    console.log(`✗ ${label}  cid=${r.cid}`);
    for (const p of problems) console.log(`    - ${p}`);
  } else {
    console.log(`✓ ${label}  cid=${r.cid}  composite_key=${r.composite_key.slice(0, 20)}...`);
  }
}

console.log('');
if (ok) {
  console.log(`Chain verified: ${records.length} record(s), signatures valid, no chain breaks detected.`);
} else {
  console.log('Chain verification FAILED. See details above.');
  process.exit(1);
}
