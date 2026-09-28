# AGENTS.md — Grønli Trust & IPFS Anchor Rules

## Roles & Responsibilities
- **Primary Task:** Receive structured input payload, build deterministic IPLD `.car` archive, sign payload composite key, and pin result to Pinata IPFS.
- **Lexicon Governance:** Reject any payload containing unmapped schema fields not present in `TRUST_LEXICON_CID` (`bafkreiah7zzhane2iwpijyx7qiuwajqbmaep3a4pnvuo5f4jcakm4ibnzi`).

## Security Policy
1. **Zero Secret Exposure:** Never log `PINATA_JWT` or `ED25519_PRIVATE_KEY` in tool outputs or HTTP response payloads.
2. **Immutable Provenance:** Always link incoming records to `prev_composite_key` in local SQLite before outputting the final CID.
3. **Verification Protocol:** Calculate `composite = SHA512(cid + ":" + spatial + ":" + rule)` before issuing Ed25519 signature.
