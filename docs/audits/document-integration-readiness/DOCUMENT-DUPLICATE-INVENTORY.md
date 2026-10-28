# Document duplicate inventory

This read-only maintenance tool identifies the condition rejected by the governed generation contract: more than one canonical `Document` row attached to the same `Project`.

- All project and document statuses are included, including archived or inactive projects.
- Document language/content does not create a separate canonical authority.
- `ProjectVersion` history is intentionally excluded and is not a duplicate.
- Projects and organizations remain separate grouping boundaries.
- No document content, title, URL or storage reference is queried or emitted.
- PostgreSQL enforces `SET TRANSACTION READ ONLY` before the inventory query.
- Results are keyset-paginated in pages of 100 and fail closed above 10,000 duplicate groups.
- The tool never selects a winner, deletes, merges, archives or mutates a row.

The governed production workflow prints only aggregate counts. Project and organization identifiers are retained for seven days in a protected GitHub artifact so an authorized operator can preserve the evidence outside GitHub and then allow automatic expiry.
