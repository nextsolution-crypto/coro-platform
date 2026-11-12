# Threat model

Assets: device identity/private key, signed manifests/renders, emergency state, revocation/anti-rollback anchors, audit journal and command stream. Adversaries include a foreign tenant, replaying caller, compromised kiosk user, DNS rebinder, cache modifier and physically present attacker.

Controls: external non-exportable signer, TLS/device proof, composite tenant scope, one-time enrollment, signed/hash-addressed content, loopback/Host/CSP, Chromium sandbox/policy, atomic persistence, append-only hash-chained journal, monotonic sequence/idempotency, revocation and governed clear.

Residual risks: privileged physical access, firmware/supply-chain compromise, unproven signer hardware, display blackout not seen by heartbeat, power quality and Linux-image drift. These block physical acceptance, not software review.
