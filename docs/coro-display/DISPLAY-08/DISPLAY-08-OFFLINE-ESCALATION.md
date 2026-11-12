# Offline escalation

States: heartbeat late → device offline → command pending/not received → applied not confirmed → stale emergency observation. Each transition records device, scope, timestamps and responsible queue without exposing content secrets.

Escalation is informational in test: no real SMS/email. Reconnect reconciles by command/idempotency key and cannot infer physical visibility from an acknowledgement.

A production scheduler/notification policy is outside DISPLAY-08 and remains disabled.
