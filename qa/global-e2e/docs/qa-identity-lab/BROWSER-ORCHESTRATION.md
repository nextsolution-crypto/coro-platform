# Browser orchestration

`QaIdentityLab` provides `loginAs`, `completeMfa`, `logout`, `resetSession`, `assertRoleAndScope` and `assertUnauthorized`. Actor definitions and credentials are separate; credentials are loaded from the restricted D: store.

Browser campaigns must use separate contexts/profiles per actor, measured viewport dimensions, real HTTP responses and sanitized evidence under D:. Tokens, MFA codes and passwords must never be printed or written to screenshots. A failed preflight stops the campaign before Chrome is launched.
