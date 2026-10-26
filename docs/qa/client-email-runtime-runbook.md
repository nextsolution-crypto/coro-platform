# Client email QA runtime

The runtime binds only to loopback: backend `http://127.0.0.1:3102/api`, client portal `http://127.0.0.1:3103`, and PostgreSQL QA `127.0.0.1:55471/coro_email_qa`.

The startup script refuses occupied ports, a missing QA container, a malformed dedicated Brevo file, a non-QA database, production portal URLs, extra CORS origins, and missing QA-only JWT/MFA secrets. It creates fresh ephemeral JWT and MFA secrets for each start; restarting intentionally invalidates sessions.

From PowerShell in the worktree root:

```powershell
.\qa\start-client-email-runtime.ps1
```

Logs and the non-secret PID manifest are written to `D:\coro-qa-runtime`. The script builds the portal with `NEXT_PUBLIC_API_URL=http://127.0.0.1:3102/api`, starts both applications hidden, and waits for HTTP 200 responses. It does not run `PREPARE` or an email scenario.

Stop both process trees with:

```powershell
.\qa\stop-client-email-runtime.ps1
```

Only `Origin: http://127.0.0.1:3103` may receive an `Access-Control-Allow-Origin` response. Production origins must not be allowed by the QA profile.

Client authentication and trusted-device tokens are currently stored in browser `localStorage`; the backend does not issue client authentication cookies. MFA remains mandatory after password login and magic-link claim. The short-lived email handoff used after a magic-link claim is stored in `sessionStorage` and is removed when `/login` consumes it; the account address is not placed in the URL. Password reset increments `sessionVersion`, invalidating prior JWTs, and removes trusted devices.

New magic links expire after 15 minutes. Existing database rows retain their recorded `expiresAt`, so this change needs no migration and does not retroactively extend or shorten an already-issued link. Validation remains atomic, single-use, hashed at rest, and followed by MFA.

Do not paste secrets into commands or logs. Do not run `PREPARE`, `INVITATION`, `PASSWORD_RESET`, or `MAGIC_LINK` without the separate controlled-acceptance procedure.

## Static asset recovery

The product `npm run build` command has no dependency on `D:\coro-qa-runtime`. The QA-only `npm run qa:build` command has a guard: rebuilding the active default `.next` is refused while the PID recorded in `D:\coro-qa-runtime\client-email-runtime.json` is alive. The QA startup script uses `qa:build`. Validation builds use the product build with an isolated `NEXT_DIST_DIR` and therefore never overwrite the active runtime.

Production defaults bind the backend to `0.0.0.0:3002`, matching the Dockerfile `EXPOSE 3002` and the Compose port mapping. Production CORS keeps the historical `FRONTEND_URL` origin and can add an explicit comma-separated `CORS_ALLOWED_ORIGINS` list. Both variables accept only exact HTTP(S) origins without credentials, paths, queries, fragments, or wildcards. The Email E2E QA profile instead requires `127.0.0.1:3102` and exactly `http://127.0.0.1:3103`; it refuses `FRONTEND_URL` and unknown QA profile names.

The Docker ignore files exclude all `.env*` files, build caches, coverage, and local artifacts. The controlled email runner is excluded from `tsconfig.build.json`, so it remains available to the QA `ts-node` command but is absent from the backend `dist` directory copied into the production image. The portal guard exists only in the builder source stage; the production stage copies only the Next.js standalone output, static resources, and public assets.

If HTML responds but `/_next/static` resources fail, first confirm the recorded portal PID and process tree. Stop only that portal tree, rename the corrupt `.next` to a timestamped `.next-corrupt-*` directory, build with `NEXT_PUBLIC_API_URL=http://127.0.0.1:3102/api`, copy `.next/static` and `public` into `.next/standalone`, and restart only `node .next/standalone/server.js` on `127.0.0.1:3103`. Never delete the evidence directory or restart PostgreSQL for this repair.

Health checks must fetch `/login`, extract every required `/_next/static` stylesheet and script, require HTTP 200 for each, verify that the page hydrates, and confirm that the email and password fields accept input without submitting the form.

## Controlled runner commands

The wrapper always derives the PostgreSQL credential from the named QA container, percent-encodes it, fixes the destination to `info@getcoro.io`, and fixes evidence storage to `D:\coro-qa-runtime\email-evidence`. Database credentials are passed only through the child environment and are cleared immediately afterward.

Read-only inspection does not require a run ID:

```powershell
.\qa\run-client-email-acceptance.ps1 -Mode INSPECT
```

Preparation requires an explicit run ID and matching confirmation:

```powershell
$runId = 'email-qa-20261025-001'
.\qa\run-client-email-acceptance.ps1 -Mode PREPARE -RunId $runId -PrepareConfirmation "PREPARE:$runId"
```

Each live scenario requires two distinct parameters. Execute only one scenario per reviewed command:

```powershell
$confirmation = "INVITATION:${runId}:info@getcoro.io"
.\qa\run-client-email-acceptance.ps1 -Mode INVITATION -RunId $runId -ScenarioAuthorization $confirmation -HumanConfirmation $confirmation

$confirmation = "PASSWORD_RESET:${runId}:info@getcoro.io"
.\qa\run-client-email-acceptance.ps1 -Mode PASSWORD_RESET -RunId $runId -ScenarioAuthorization $confirmation -HumanConfirmation $confirmation

$confirmation = "MAGIC_LINK:${runId}:info@getcoro.io"
.\qa\run-client-email-acceptance.ps1 -Mode MAGIC_LINK -RunId $runId -ScenarioAuthorization $confirmation -HumanConfirmation $confirmation
```

Provider verification is one-shot and requires one scenario:

```powershell
.\qa\run-client-email-acceptance.ps1 -Mode VERIFY -RunId $runId -VerifyScenario INVITATION
```

To record one reviewed human milestone, add for example `-HumanEvidence "MAILBOX_RECEIVED:INVITATION-$runId"`. Generate the current report without sending:

```powershell
.\qa\run-client-email-acceptance.ps1 -Mode REPORT -RunId $runId
```

There is deliberately no command that sends all three emails. Never execute the preparation or live examples without the corresponding human approval.
