# DISPLAY-04B-VISUAL-ACCEPTANCE — Security

- Approval continues to require authenticated JWT, active organization, spatial authorization, and `DISPLAY_PLAN_APPROVE`.
- Tenant, building, floor, document, version, render, location, and actor remain linked through DISPLAY-03 constraints.
- Exact source/render hashes and optimistic locking prevent stale approval.
- Author, reviewer, and approver separation is retained.
- Approval evidence is append-only and contains no private key, token, or permanent public URL.
- Variants are served with `private, no-store`; this change does not expose new routes.
- PostgreSQL regression validates cross-building denial and revocation on a disposable database.
- Private plan evidence remains outside Git and production storage.

No production database, shared migration, real customer record, public Player, or physical screen was modified.
