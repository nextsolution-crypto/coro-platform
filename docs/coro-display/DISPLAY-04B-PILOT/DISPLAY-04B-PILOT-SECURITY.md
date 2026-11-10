# DISPLAY-04B-PILOT — Security

## Controls retained

- Source digest allow-list for this pilot; unexpected input is rejected.
- PDF processed outside the HTTP backend by the existing DISPLAY-04A worker.
- Docker worker: network disabled, non-root, read-only root, capabilities dropped, no-new-privileges, CPU/memory/PID limits.
- Private local render folder outside the Git worktree.
- PNG signature, byte-size, dimension, and output digest checks.
- PostgreSQL service test for spatial authorization, tenant/building boundaries, immutable approved source, and revocation.

## Data handling

No secrets were passed to the rasterizer. No real identity, invitation, notification, shared migration, public URL, or production object was created. The PDF and render evidence are excluded from Git.

## Residual risks

Visual safety correctness requires human approval. The local runner is QA tooling and does not replace the governed application publication path. Dependency audit findings are reported without automatic remediation.
