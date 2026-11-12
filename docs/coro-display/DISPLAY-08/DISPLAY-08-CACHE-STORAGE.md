# Cache and storage

Content is staged, hashed with SHA-256, checked against the signed manifest and atomically promoted. Incomplete/corrupt candidates never replace the last valid render. Revocation and anti-rollback anchors persist separately.

Writable state is restricted to `/var/lib/coro-display` and logs to `/var/log/coro-display`; code/configuration are read-only to Player. Disk pressure must stop new activation before the active plan is endangered.

Existing tests cover corruption, interrupted writes, restart, revocation and rollback. Real filesystem exhaustion and power loss during flush remain **NOT_VERIFIED**.
