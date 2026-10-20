# Synthetic actor catalogue

| Actor | Role | Authority contract |
|---|---|---|
| Founder QA | SUPER_ADMIN | Platform access only through governed Platform Authority |
| Delegated employee | OPERATOR | Explicit grants only |
| CORO advisor | OPERATOR | Assigned projects only |
| Client corporate A | CLIENT_CORPORATE | All buildings in tenant A |
| Client regional A | CLIENT_MANAGER | Explicit Network-region assignment |
| Client local A | CLIENT_MANAGER | Explicit building assignment |
| Client without buildings | CLIENT_MANAGER | Fail closed: zero buildings |
| Client organization B | CLIENT_CORPORATE | Tenant B only |
| Revoked user | OPERATOR, inactive | Authentication denied |

All addresses use `@global-e2e.test`. Definitions are reusable; database rows are recreated in disposable QA databases. No production identity is copied.
