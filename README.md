# Trust Backup Agent

A small, self-contained GitHub Actions agent that pins files to IPFS
via [Pinata](https://pinata.cloud), wraps each one as a
[CVP-0.1](https://github.com/) object (content-addressed, Ed25519-signed,
hash-chained), and keeps a locally verifiable ledger of the result.

## What it proves

- ✅ The pinned content is byte-for-byte unchanged since upload (CID).
- ✅ A specific Ed25519 key signed each record.
- ✅ Records form an unbroken, ordered chain (no silent reordering or
  deletion).

## What it does NOT prove or claim

- ❌ Legal ownership of anything described in the pinned content.
- ❌ Jurisdiction, sovereignty, or legal authority of any kind.
- ❌ That the content is factually true — only that it is unchanged.

See [`docs/OPERATING_RULES.md`](docs/OPERATING_RULES.md) and the CVP-0.1
specification (§15, Non-Goals and Legal Boundary) for the full scope.

## Quick start

```bash
npm install
npm run gen-keys          # generate an Ed25519 keypair (once)
npm run init-db           # create db/trust_state.db

export PINATA_JWT="..."
export ED25519_PRIVATE_KEY="..."   # the private key from gen-keys

npm run build-and-pin payload/example.txt
npm run verify
```

See [`docs/BOOTSTRAP.md`](docs/BOOTSTRAP.md) for full setup, including
how to wire this into GitHub Actions so it runs automatically on push.

## Structure

```
.
├── .github/workflows/sync-to-pinata.yml   # CI: pin on push, verify, commit ledger
├── db/
│   ├── schema.sql                         # SQLite schema
│   └── trust_state.db                     # generated, do not hand-edit
├── docs/
│   ├── BOOTSTRAP.md                       # setup steps
│   ├── IDENTITY.md                        # agent identity & scope
│   └── OPERATING_RULES.md                 # chain rules
├── payload/                               # put files to be pinned here
├── scripts/
│   ├── gen-keys.js                        # generate Ed25519 keypair
│   ├── init-db.js                         # create/reset local ledger
│   ├── build-and-pin.js                   # pin + sign + record
│   └── verify.js                          # independently re-verify the chain
├── agent.config.json                      # agent identity & Pinata config
└── package.json
```

## License

MIT — see LICENSE.
