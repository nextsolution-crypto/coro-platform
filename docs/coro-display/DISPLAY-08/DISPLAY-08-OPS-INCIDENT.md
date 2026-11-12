# Ops and Incident boundary

DISPLAY-07 persists canonical commands, scopes targets and enforces priority/idempotence/audit. DISPLAY-08 consumes only synthetic approved commands through the device Gateway.

Human routes cannot claim `CORO_OPS` or `CORO_INCIDENT` machine provenance. A future adapter needs its own service identity, tenant/building/zone authorization, signed contract and rollback plan.

No adapter is activated; no incident, alarm, evacuation or external communication is triggered.
