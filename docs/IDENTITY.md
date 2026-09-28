# Agent Identity

**Agent ID:** `trust-backup-agent-v1`

## What this agent does

Runs inside GitHub Actions. On a push to `payload/`, it:

1. Uploads each changed file to IPFS via Pinata, obtaining a CID.
2. Wraps the CID in a CVP-0.1 object (spatial / rule / relation vectors).
3. Computes a composite key and signs it with an Ed25519 key.
4. Links the new record to the previous one (provenance chain).
5. Records the result in `db/trust_state.db`.
6. Re-verifies the entire chain before committing the updated ledger.

## What this agent does NOT do

- It does not establish legal ownership of anything referenced in a
  payload file.
- It does not create a jurisdiction, sovereign status, or legal
  authority of any kind.
- It does not replace deeds, contracts, or other legal instruments.
- It does not decide what content is "true" — only that content is
  unchanged, signed, and in an unbroken sequence.

See the CVP-0.1 specification, §15 ("Non-Goals and Legal Boundary"),
for the full statement of scope.

## Access rules

- Only GitHub Actions (via repository secrets) holds the signing key
  at runtime. The key never appears in source, logs, or the SQLite DB.
- The public key is published here for anyone to verify signatures
  independently:

  ```
  PUBLIC_KEY (base64): <paste output of `npm run gen-keys` here>
  ```

- Anyone can re-run `npm run verify` against `db/trust_state.db` to
  independently confirm signature validity and chain continuity — no
  trust in this repository's maintainer is required for that check.
