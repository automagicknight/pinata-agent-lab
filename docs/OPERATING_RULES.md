# Operating Rules

This agent operates under CVP dictionary `cvp-core-dictionary-v1`
(sequence 84 in the Commons Vector Protocol instrument registry),
pinned at:

```
bafkreiah7zzhane2iwpijyx7qiuwajqbmaep3a4pnvuo5f4jcakm4ibnzi
```

## Rules

1. **One event per file per run.** Each file uploaded in a single
   workflow run becomes its own CVP object with its own sequence
   number — files are never batched into a single composite key.

2. **Append-only.** Existing rows in `trust_records` are never
   updated or deleted. Corrections are new rows with
   `event_type = 'amend'` or `'supersede'`, referencing the row they
   correct.

3. **No silent chain edits.** `db/trust_state.db` is only ever
   modified by `scripts/build-and-pin.js` running in CI. Manual edits
   to the database file will be caught by `scripts/verify.js`
   (signature/chain checks will fail).

4. **Scope of claims.** Every record in this ledger asserts only:
   - the referenced CID's content is unchanged since pinning,
   - the listed public key signed the composite key,
   - the record's position in the chain is as stated.

   No record in this ledger asserts ownership, legal right, or
   jurisdiction over anything the pinned content describes.

5. **Key rotation.** If `ED25519_PRIVATE_KEY` is ever rotated, publish
   a `supersede` event (manually, following the CVP-0.1 spec §8.4)
   referencing the old public key before switching the GitHub secret.
