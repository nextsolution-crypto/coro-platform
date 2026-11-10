# DISPLAY-03 Integration — Prisma Review

## Noise reduction

The feature schema had been globally formatted, producing 259 additions and 120 deletions. The schema was reconstructed from the verified `origin/main` baseline and only DISPLAY-03 declarations were reapplied. Final schema delta: **139 additions, 0 deletions**.

No unrelated model, attribute, index or relation was reordered. In particular, historical Incident authority declarations were preserved byte-for-byte.

## Additive model

- Six explicit publication permissions were added to `DisplayPermission`.
- Publication status, orientation and language enums were added.
- `DisplayPlanPublication` stores source authority, immutable variant identity, spatial scope, lifecycle actors/timestamps and optimistic lock version.
- `DisplayPlanPublicationEvent` stores idempotent, tenant-scoped transition evidence.
- Composite relations bind organization, building, floor, optional zone, location and source file.
- A partial SQL unique index guarantees at most one `PUBLISHED` publication per location.

`prisma validate` and `prisma generate` both pass with Prisma 6.19.3. The schema intentionally does not model the partial index because Prisma schema syntax cannot express that PostgreSQL predicate; the migration remains the authority for it.
