# GitHub CI

PR #254 and #256 were observed as Draft during preflight; DISPLAY-07 #255 is merged in the baseline. DISPLAY-08 Draft PR: **#257** (`integration/coro-display-08` → `main`).

Required checks: backend security/frontend/client portal, TypeScript, backend/PostgreSQL/migrations, Knowledge, OCR/PDF extraction, builds, Display E2E/adversarial. `build-images` and `production-release` must remain SKIPPED.

Initial PR HEAD `12442a441735519c64d45a6c7d853f344bbd9fed`: Backend security, backend tests, client portal build and all four application typechecks PASS. `build-images` and `production-release` SKIPPED as required. This evidence update triggers a final documentation-only CI pass. No merge, auto-merge or deployment is authorized.
