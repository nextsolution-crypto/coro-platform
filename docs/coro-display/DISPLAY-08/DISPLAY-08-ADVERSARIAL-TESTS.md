# Adversarial tests

Existing DISPLAY-06/07 suites cover forged/foreign device, replayed invitation/command, wrong key, tampered manifest/render/cache/journal, revocation, rollback, DNS rebinding, public bind, unsafe Chromium flags, unauthorized emergency clear and tenant crossing.

DISPLAY-08 adds fail-closed host preflight, signer-capability distinction, telemetry redaction/bounds, display-profile validation and installer/policy contracts. Targeted result: 22 Jest tests PASS plus 3 installer contracts PASS.

Real USB boot, firmware tamper, key extraction and physical console escape are **NOT_EXECUTED**.
