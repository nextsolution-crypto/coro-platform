# CORO WEB-AI-00 — Release acceptance

Date: 2026-10-27  
Scope: security stabilization of the public CORO AI Web assistant  
Final production commit: `2cd919b6a0fa52fd4af59b9bdf61a3fcb5691ccf`

## Delivery evidence

- Source branch: `fix/web-ai-00-security-stabilization`
- Source commit: `6fec1ff20f76d1aa11f21e4698a28c1e4c685a84`
- Pull request: `#108` — `fix(web-ai): secure public assistant contact flow`
- Merge commit: `2cd919b6a0fa52fd4af59b9bdf61a3fcb5691ccf`
- PR checks: PASS
- Post-merge validation run: `40580306272` — SUCCESS
- Pre-release production inspection: `40580958001` — PASS / GO
- Governed release run: `40581150211` — SUCCESS
- Post-release production inspection: `40582976165` — PASS / GO

## Security controls delivered

- A commercial keyword only suggests the contact interface; it does not submit a request.
- Contact submission requires an explicit user action and consent.
- Commercial summaries are bounded and HTML-escaped before provider submission.
- A provider response is accepted only when a valid Brevo message identifier is returned.
- Chat DTOs use strict validation, normalized text, allowed roles and bounded content.
- The public chat payload is limited to 32 KiB.
- The browser sends at most the last 10 messages and truncates each message to 2,000 characters.
- The chat input is limited to 2,000 characters.
- Public chat and contact endpoints retain throttling, timeouts and fail-closed behavior.
- Local request idempotency prevents immediate duplicate contact submissions.
- Prompt references for PGC, PRA and PUE were corrected.
- No real commercial email or provider contact was emitted during QA or post-release inspection.

## Validation

- Focused backend security suite: 15/15 PASS.
- Website test suite: 713/713 PASS.
- Backend and website TypeScript: PASS.
- Targeted backend and website ESLint: PASS.
- Backend and website production builds: PASS.
- Git diff check: PASS.
- GitHub PostgreSQL, OCR and Knowledge runtime checks: PASS.
- Website dependency audit: 0 known vulnerabilities.
- Backend dependency audit: 10 pre-existing production advisories (1 moderate, 8 high, 1 critical); no automatic dependency mutation was applied in this security lot.

## Production state

- Active commit: `2cd919b6a0fa52fd4af59b9bdf61a3fcb5691ccf`.
- Release state: `SUCCESS / SUCCEEDED`.
- PostgreSQL: 16.15.
- Migration head: `20261109010000_sentinelle_presence_sessions`.
- Migration count: 155; failed migrations: 0.
- Remote backup: `REMOTE_VERIFIED`; remote SHA-256 verified.
- Restore exercise: `RESTORE_VERIFIED`.
- Rollback images available: 4.
- Deployment lock: free after release.
- Disk after release: 73% used, 21,814,112 KiB free.

Active application image digests:

- Backend: `sha256:981abdf1eb2eedcd4b27841d31621525668cc7ce59437419af76feda3e794c9b`
- Frontend: `sha256:79b62e0fb8354dced435fe87feb17ab2371801d59c07d9c3307f9eaeaf269663`
- Client Portal: `sha256:8a5e889493d6ee650e7b515c575c2c113e3bf6a0bf821f35602cc588ff90cadb`
- Website: `sha256:7211627dd9c9fafca2ca77ae01df835bea08880749dce93fe007b57773920e7d`

## Public post-release inspection

- `/`, `/coro-ai`, `/coro-knowledge`, `/diagnostic`, `/pricing` and `/sitemap.xml`: HTTP 200.
- The public widget is visible, opens and accepts a question.
- No browser console warning or error was observed during the check.
- The production question returned the governed degraded response: the assistant was temporarily unavailable and referred the visitor to the existing contact address.
- No commercial form was submitted and no real commercial email was sent.

The degraded response demonstrates fail-closed continuity, but it does **not** demonstrate successful production AI-provider answering. Provider availability remains an operational follow-up, distinct from the successful WEB-AI-00 security release.

## Residual reservations

- A successful real provider answer is NOT_VERIFIED in this release inspection.
- Backend dependency advisories remain tracked technical debt and require a separately reviewed upgrade plan.
- GitHub Actions reports non-blocking upcoming runner changes (Node.js 20 action runtime deprecation and the `ubuntu-latest` migration).
- WEB-AI-00 does not activate Bedrock, public Knowledge ingestion, autonomous operational actions or automatic commercial communication.

## Verdict

`WEB_AI_00_STATUS: VALIDATED_AND_DEPLOYED_WITH_PROVIDER_AVAILABILITY_RESERVATION`

The security stabilization is merged, deployed and reconciled on the exact production SHA. The public assistant fails closed when the provider is unavailable. WEB-AI-02 remains a separate, prepared plan and is not authorized or implemented by this release.
