# Preflight checklist

1. QA-only secret store exists under `D:\CORO-QA\secrets` with restricted ACLs.
2. PostgreSQL 16 is disposable and migrations contain no failed row.
3. All nine actors exist with expected active state, role, tenant and scope.
4. Backend and both frontends are healthy.
5. Portal/frontend origins exactly match backend CORS configuration.
6. MFA capture adapter health succeeds with the protected channel token.
7. No Brevo, Twilio, AWS or other production credential is present.
8. Application network is internal/deny-by-default and provider egress probe fails.
9. Chrome executable is available.
10. Required fixture data and permissions exist.

Any failure blocks the browser campaign with its exact gate identifier.
