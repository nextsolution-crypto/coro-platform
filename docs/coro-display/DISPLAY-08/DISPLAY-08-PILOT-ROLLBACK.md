# Pilot rollback

Rollback is allowed only to a signed Player/runtime compatible with current schema, manifest, revocation and emergency semantics. Image availability alone is insufficient.

Procedure: stop new commands; preserve emergency/cache/journal; verify rollback artifact hash/signature and security compatibility; install previous immutable package; restart; verify identity, active plan/emergency, journal chain, Gateway reconciliation and Manager health.

If the previous version weakens DISPLAY-06/07 controls, remain stopped on the safe cached plan and escalate instead of rolling back. Physical rollback rehearsal: **NOT_EXECUTED**.
