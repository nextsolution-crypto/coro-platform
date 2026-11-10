# DISPLAY-03 Integration — Security Validation

## Demonstrated controls

- Canonical actor organization must match the route organization.
- Exact Display permission and explicit building assignment are both required.
- ADMIN and SUPER_ADMIN receive no implicit Display authority.
- Foreign building and foreign publication access are refused.
- Contradictory floor/location scope is refused before creation.
- Author cannot self-review; reviewer cannot approve their own review.
- Source must remain the same approved private file, version and SHA-256.
- Publication rechecks source and spatial authority inside the transaction.
- Optimistic locking and request identifiers protect concurrency/idempotence.
- Player retrieval reauthorizes every request; suspension/revocation prevents subsequent download.
- Audit events contain governed identifiers and hashes, not private file bytes or credentials.

## Renderer boundary

Input is limited to 25 MiB; normalized coordinates are constrained to `[0,1]`; orientation is constrained to `[0,360)`; dimensions are bounded to 16,384 pixels and 100 million pixels. The current renderer is a bounded prototype and is not a production PDF engine.

## Residual risks

- A production PDF engine requires legal/package review and sandboxing. Poppler is the prototype recommendation after GPL review; PDFium is the permissive alternative; MuPDF requires AGPL or commercial licensing consideration.
- Real browser/Player offline behavior is outside DISPLAY-03.
- Secret scan found no credential or personal destination introduced by this lot.
