# Client portal email — controlled live acceptance

This procedure governs the only permitted live-email destination: `info@getcoro.io`. It must be run only against the isolated PostgreSQL database `coro_email_qa` on loopback port `55471` and a non-production portal origin. Generated evidence lives outside Git in `CLIENT_EMAIL_EVIDENCE_ROOT`.

## Safety model

- `INSPECT`, `VERIFY`, and `REPORT` never send email. `VERIFY` performs one provider-events lookup and never retries.
- `PREPARE` is the only fixture-writing mode. It requires `CLIENT_EMAIL_PREPARE_AUTHORIZATION=PREPARE:<run-id>`.
- Each sending mode requires both `CLIENT_EMAIL_SCENARIO_AUTHORIZATION` and `CLIENT_EMAIL_HUMAN_CONFIRMATION` set to `<SCENARIO>:<run-id>:info@getcoro.io`.
- A scenario can be attempted once per run. Failed or ambiguous provider results require a new run ID after human review.
- The runner validates the URL coordinates and the connected PostgreSQL database, user, server address and port. Reserved deterministic IDs must not collide with non-synthetic records.
- The dedicated secret file must contain only `BREVO_API_KEY`. Never print or copy it.

## Required configuration

Set `DATABASE_URL`, `CLIENT_PORTAL_PUBLIC_URL`, `CLIENT_EMAIL_RECIPIENT_ALLOWLIST=info@getcoro.io`, `CLIENT_EMAIL_EVIDENCE_ROOT`, `CLIENT_EMAIL_RUN_ID`, `CORO_SOURCE_COMMIT`, and, only for sending or provider verification, `CLIENT_EMAIL_QA_SECRET_FILE`. The portal URL must be loopback or remote HTTPS and must not be a CORO production hostname.

Use a unique run ID such as `email-qa-20261025-001`. Start with `CLIENT_EMAIL_ACCEPTANCE_MODE=INSPECT`, then use `PREPARE`. Do not proceed if either command refuses an invariant.

Run `INVITATION`, `PASSWORD_RESET`, and `MAGIC_LINK` independently and only after the human operator sets the two exact scenario confirmations. Never put all three confirmations in a reusable script.

## Human validation

For each scenario, the operator records milestones individually. `CLIENT_EMAIL_HUMAN_EVIDENCE` accepts one value at a time in the form `<MILESTONE>:<SCENARIO>-<run-id>` while running `VERIFY`. Permitted human milestones are `MAILBOX_RECEIVED`, `LINK_OPENED`, `APPLICATION_VERIFIED`, `REPLAY_REJECTED`, `EXPIRED_REJECTED`, and `REVOKED_REJECTED`.

Invitation validation must use the QA portal UI/API, complete real MFA, inspect the authenticated client scope, and never call `ClientAuthService.login()` directly. Password reset must prove the new password works, the former password fails, replay and deterministic expiry fail, and earlier sessions are revoked. Magic link must prove the UI request, MFA challenge, valid session, and rejection of replay/expiry/revocation.

Do not store passwords, raw tokens, token-bearing URLs, cookies, authorization headers, JWT secrets, or full sensitive responses in evidence. Provider message IDs are retained only to perform the single delivery lookup.

## Failure and resume

On provider failure or ambiguity, stop. Do not rerun the scenario with the same run ID. Inspect application/provider state manually, preserve the evidence, create a new run ID, run `INSPECT`, and obtain new explicit authorization. `PREPARE` never deletes data. No database cleanup is part of this procedure.

If the QA portal, isolated database, dedicated JWT secret, HTTPS origin (for remote access), CORS allowlist, or QA mailbox access is unavailable, stop before sending.

## Traceability matrix

| Scenario | Request surface | Provider proof | Application proof | Negative proof |
| --- | --- | --- | --- | --- |
| Invitation | Controlled runner, then portal login | Accepted ID and delivered event | MFA and scoped session through endpoints/UI | Non-QA recipient and reused run refused |
| Password reset | Portal forgot-password page | Accepted ID and delivered event | Link, password change, new login, session revocation | Old password, replay, expiry refused |
| Magic link | Portal magic-link request page | Accepted ID and delivered event | Link claim, MFA, scoped session | Replay, expiry, send-failure revocation refused |

## Review checklist

Before declaring `READY FOR CONTROLLED LIVE ACCEPTANCE`, verify targeted tests, backend and portal builds, Prisma validation, lint/format checks, `git diff --check`, QA PostgreSQL identity, Git exclusion of the evidence root, and absence of real sends during implementation. `EMAIL E2E VERIFIED` is forbidden until all mailbox and application milestones have explicit evidence.
