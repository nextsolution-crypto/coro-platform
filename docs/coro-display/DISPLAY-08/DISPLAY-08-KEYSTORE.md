# Keystore

The production contract is `CommandDeviceKeyStore`: key ID and Ed25519 public key are configured; the payload crosses IPC to an external provider; only a base64 signature returns. Chromium never receives this interface.

Preferred pilot: a PKCS#11 provider whose exact token proves Ed25519 key generation and signing. TPM 2.0 may seal the provider credential and runtime-integrity anchor, but TPM-native Ed25519 is not assumed. Software keys are allowed only in isolated tests and are reported `hardwareBacked=false`.

Lifecycle: generate on device/provider; enroll public key by one-time invitation and proof of possession; rotate through a separately authorized new key; revoke old key before disposal; replacement device obtains a new identity. Private export is forbidden.

Real token/TPM signing, recovery and rotation: **NOT_VERIFIED**.
