// Generates an Ed25519 keypair for signing CVP objects.
// Run once. Store the PRIVATE key as a GitHub secret (ED25519_PRIVATE_KEY);
// never commit it to the repository.

import nacl from 'tweetnacl';

const keypair = nacl.sign.keyPair();

function toBase64(bytes) {
  return Buffer.from(bytes).toString('base64');
}

console.log('--- Ed25519 keypair generated ---');
console.log('');
console.log('PUBLIC KEY  (safe to commit / publish):');
console.log(toBase64(keypair.publicKey));
console.log('');
console.log('PRIVATE KEY (SECRET — store as a GitHub Actions secret, never commit):');
console.log(toBase64(keypair.secretKey));
console.log('');
console.log('Add the private key as: Settings → Secrets and variables → Actions → New repository secret');
console.log('Name it: ED25519_PRIVATE_KEY');
