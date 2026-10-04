# Sentinelle Population contact-change cryptography

This authority protects temporary proposed phone and email destinations for
the future Population contact-change workflow. It is not a general CORO
encryption framework or a key-management service.

## Configuration

The backend accepts three deployment-managed variables:

- `POPULATION_CONTACT_CHANGE_ACTIVE_KEY_ID`: the key ID used for new writes;
- `POPULATION_CONTACT_CHANGE_ENCRYPTION_KEYS`: a compact canonical JSON object
  mapping key IDs to Base64-encoded 32-byte AES keys;
- `POPULATION_CONTACT_CHANGE_FINGERPRINT_KEY`: a distinct Base64-encoded
  32-byte HMAC key.

Key IDs contain only ASCII letters, digits, `.`, `_`, and `-`, start with an
alphanumeric character, and are at most 64 characters. The keyring contains
at most ten unique keys with unique material. Keys must be generated outside
the application using a cryptographically secure random source. Never use a
password or copy another CORO secret. The application never generates or
prints keys.

All three variables absent means `contactChangeCrypto = NOT_CONFIGURED`.
Partial, malformed, duplicated, or reused configuration means `INVALID`.
This capability is additive and does not block unrelated Population
operations.

## Protection contract

`PopulationContactCryptoService` exposes only:

- `protectDestination({ challengeId, type, plaintext })`;
- `unprotectDestination({ challengeId, type, protectedValue })`;
- `fingerprintDestination({ type, canonicalDestination })`.

The serialized `v1` envelope is a compact JSON object:

```json
{
  "version": "v1",
  "keyId": "example-key-id",
  "iv": "base64url",
  "ciphertext": "base64url",
  "tag": "base64url"
}
```

Encryption uses Node AES-256-GCM with a fresh random 12-byte IV and a 16-byte
authentication tag. AAD canonically binds CORO, Population, ContactChange,
format version, key ID, challenge ID, and contact type. Substituting a row,
challenge, type, version, key ID, IV, ciphertext, or tag fails closed.

The future database contract is one nullable serialized-envelope column plus
one separate fingerprint column. Future 01B code must set the recoverable
envelope to `NULL` as soon as a challenge becomes terminal. The fingerprint
is HMAC-SHA-256 over a versioned, type-separated canonical input and is hex
encoded. It is not reversible, is never returned publicly, and is not a
canonicalization authority.

## Rotation

Encryption-key rotation is read-old/write-current:

1. Generate a new independent 32-byte key outside the application.
2. Add it to the keyring while retaining the old key.
3. Deploy and verify readiness.
4. Change the active key ID to the new key and deploy.
5. New envelopes use the new key; old operational envelopes remain readable.
6. Wait until no supported operational or restored challenge needs the old
   key.
7. Remove the old key and verify readiness again.

The service never tries arbitrary keys and never re-encrypts on read. A key
may be retired only after operators establish that no operational protected
value or supported backup restore requires it.

The fingerprint key is a stable V1 authority. Changing it changes every
fingerprint and therefore requires a separate coordinated data migration.
It must not be rotated as part of normal encryption-key rotation.

## Operational and backup boundary

The keyring is environment-injected application key material, not a KMS,
HSM, Vault, or automatic rotation facility. A database backup alone does not
reveal protected proposed destinations. Restoring an operational challenge
also requires the historical encryption key named by its envelope.

This protects against accidental plaintext database exposure, database dump
exposure without application secrets, ciphertext tampering, and context/row
substitution. It does not protect against an attacker controlling the
application runtime, environment secrets, and database simultaneously.

Plaintext is not cached or logged. JavaScript does not provide guaranteed
memory zeroization, so decrypted values must be used immediately and not
retained by callers. Unknown formats, unavailable keys, invalid
configuration, and authentication failures never fall back to plaintext.
