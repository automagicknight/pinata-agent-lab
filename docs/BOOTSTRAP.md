# Bootstrap

Steps to get the agent running from scratch.

## 1. Get a Pinata JWT

1. Create a free account at https://app.pinata.cloud
2. Go to **Developers → API Keys → New Key**
3. Enable at minimum: `pinFileToIPFS`
4. Copy the generated **JWT** (not the API key/secret pair — the JWT).

## 2. Generate an Ed25519 signing key

```bash
cd trust-backup-agent
npm install
npm run gen-keys
```

This prints a public key and a private key, both base64-encoded.

- The **public key** is safe to publish (put it in `docs/IDENTITY.md`).
- The **private key** is a secret. Never commit it. Store it only as a
  GitHub Actions secret (next step).

## 3. Add GitHub repository secrets

Go to **Settings → Secrets and variables → Actions → New repository secret**
and add:

| Secret name | Value |
|---|---|
| `PINATA_JWT` | The JWT from step 1 |
| `ED25519_PRIVATE_KEY` | The private key from step 2 |

## 4. Initialize the local ledger

```bash
npm run init-db
```

Creates `db/trust_state.db` from `db/schema.sql`.

## 5. Test locally (optional, before relying on CI)

```bash
export PINATA_JWT="..."
export ED25519_PRIVATE_KEY="..."
echo "hello world" > payload/test.txt
npm run build-and-pin payload/test.txt
npm run verify
```

## 6. Push and let the workflow run

Any push that touches `trust-backup-agent/payload/**` triggers
`.github/workflows/sync-to-pinata.yml`, which pins the changed files,
signs them, appends them to the chain, verifies the whole chain, and
commits the updated `db/trust_state.db` back to the repo.

You can also trigger it manually from the **Actions** tab
(`workflow_dispatch`) and specify files by hand.
