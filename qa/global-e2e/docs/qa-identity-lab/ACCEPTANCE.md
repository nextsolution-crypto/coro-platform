# Acceptance

Status: `VALIDATED_LOCAL_QA`.

Validated locally:

- nine-actor catalogue and explicit authorization contracts;
- restricted, Git-free synthetic secret store;
- authenticated loopback MFA channel, unauthorized denial and single consumption;
- global harness regression suite 19/19 PASS;
- root cause of the current browser failure identified as CORS/origin orchestration;
- Computer Use Chrome runtime operational.
- disposable PostgreSQL 16 recreated with the current 143-migration local chain;
- eight active actors authenticated through canonical password + MFA flows;
- wrong password, wrong MFA, expired MFA and revoked-user denials verified;
- login throttling verified with HTTP 429 and left enabled;
- two tenants verified in distinct Chrome browser contexts;
- cross-tenant resource access denied;
- backend DNS/provider egress denied from the internal Docker network;
- authentication/MFA backend regressions 25/25 PASS.

Explicit limitation:

- real WebAuthn PRF is `NOT_VERIFIED`; the lab deliberately provides no software fallback or simulated proof.

Evidence is retained outside Git in `D:\CORO-QA\tracking\qa-identity-lab`.
