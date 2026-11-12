# Display Manager QA

Authenticated QA must verify device creation, invitation, enrollment, building/floor/zone assignment, approved plan, heartbeat/sync, emergency mode, errors, journal, revocation and retirement.

Use a synthetic tenant/building/device only. Verify inter-tenant and out-of-building refusal, inactive resources read-only, optimistic concurrency, bounded pagination and immediate revocation on an open session.

Backend contracts are covered by DISPLAY-06/07 tests. Browser acceptance against a real device remains **NOT_EXECUTED**.
