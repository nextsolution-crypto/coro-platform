# Client email acceptance security review

The runner is fail-closed around a fixed mailbox, deterministic synthetic identities, exact loopback database coordinates, verified live PostgreSQL identity, a non-production portal origin, and scenario-specific human authorization. Read-only modes cannot send. There is no send-all mode or automatic provider retry.

Raw reset and magic-link tokens are hashed before persistence. Failed sends revoke their tokens. Password reset increments the session version and revokes trusted devices and outstanding magic links. Magic-link validation atomically claims a live token and now requires the normal MFA challenge before a session can be issued.

New magic links expire after 15 minutes. Previously issued links keep the expiry already persisted in PostgreSQL and remain subject to the same atomic single-use claim. The portal no longer accepts a JWT response from magic-link validation and no longer transports the account email in a query parameter; it uses one-time tab-scoped `sessionStorage` state before MFA.

## G5 lint baseline

Before G5 cleanup, line-aware ESLint classification found no new violations in the runner, runtime configuration, email service, email tests, or `main.ts`. The auth production baseline retained 3 errors/3 warnings in `client-auth.controller.ts` and 28 errors in unchanged lines of `client-auth.service.ts`, all from existing `any`-typed request or Prisma compatibility surfaces. The two synthetic Prisma/JWT harnesses also used `any` extensively: their unsafe-type diagnostics are now suppressed only at the test-file boundary, while Prettier remains enforced. G5 adds one narrow production-line suppression for the MFA Prisma payload because this baseline's generated Prisma client predates those columns. No repository-wide lint rule was changed or disabled.

Evidence begins with no successful milestones. Provider delivery and human actions are recorded separately. Serialization rejects configured secrets, token-bearing query strings and authorization material. The generated evidence directory is ignored by Git; operators should choose a dedicated access-controlled path on D:.

Residual operational dependencies are a usable QA portal, QA-only JWT secret, correct CORS configuration, mailbox access, Brevo transactional-send permission and human execution of all UI/API acceptance steps. These cannot be certified by automated tests and must remain pending until controlled live acceptance.
