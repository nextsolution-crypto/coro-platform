# Device enrollment

Sequence: install disabled → create non-exportable key → request invitation → sign challenge → server validates organization/building/device and one-time invitation → assign location → verify signed heartbeat → activate → enable service supervision.

Existing Gateway tests cover valid enrollment, expiry/reuse rejection, wrong key, foreign tenant, revoked device and activation ordering. DISPLAY-08 does not bypass the canonical device administration service.

Operator evidence must record device serial/asset tag, exact public-key fingerprint, organization/building/floor/zone, approver and timestamps without logging a private key or enrollment token.

Physical enrollment remains **NOT_EXECUTED**.
