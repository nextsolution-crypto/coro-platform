# Website product alignment — 2026-10-26

Base: 4ebc37300222c8319ae3acd27e2d90b812a48871 (main, includes RSS and building-card delivery).
Branch: fix/website-product-alignment. Status: implemented and validated locally; not published or deployed.

## Scope

1. Client portal marketing: distinguish approved compliance deliverables from the building technical library; describe Knowledge and scoped, cited AI answers. Explicit official-signature limitations.
2. Publish localized CORO Knowledge and CORO AI pages with eligibility, processing, permissions, citations, version/revocation and human-review limits. Include routes in navigation and sitemap.
3. Update Sentinelle copy: rotating 30-second QR, parallel phones, multiple displays, explicit arrival/departure, optional revocable personal-phone recognition, shared-device limits.
4. Complete English content, metadata and FAQ for Sentinelle, Incident and Sentinelle Population. Existing French screenshots are identified as such. External incident/population operations require separate activation and acceptance.

No backend, permissions, production data, provider configuration or notification changes. Preserve the existing visual system and images. Storage of an image/scan/plan is not a promise of automatic OCR or AI eligibility.

## Local validation

- Website test suite: 647 total; 645 PASS, 2 existing skips, 0 failures.
- TypeScript: PASS.
- Production build: PASS, Next.js 16.4.3.
- git diff --check: PASS.
- Chromium production-build route matrix: 36/36 HTTP 200, localized H1 present, no document horizontal overflow. Six pages × FR/EN × 390/768/1440 px. This matrix does not establish backend or provider acceptance.
- Full-page screenshots were captured locally. Scroll-triggered reveals require scrolling before assessing content visibility.

## Delivery remaining

GitHub branch creation returned HTTP 403, Resource not accessible by integration. No branch, PR or release was created remotely.

Apply the accompanying Git format-patch in an isolated worktree based on current main. Review any newer changes before applying; do not reset or overwrite unrelated files/worktrees. Run website tests, typecheck and production build, review FR/EN pages at mobile/tablet/desktop sizes, then use the existing governed PR/release/inspection pipeline. Preserve RSS, portal and all unrelated work. Do not claim deployed until the active SHA and post-release inspection are verified.
