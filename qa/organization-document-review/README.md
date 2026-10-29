# Organization document review audit runner

This dossier validates the review and approval workflow on an explicit
candidate SHA. It covers the server contracts, PostgreSQL integrity, an actual
159-to-160 upgrade, the durable outbox worker and the authenticated browser
workflow. It does not access or modify production.

Run from the repository root:

```powershell
& .\coro-backend\node_modules\.bin\jest.cmd --config .\qa\organization-document-review\jest.config.cjs --runInBand
```

Run the browser campaign only against the isolated Identity Lab runtime. Its
output directory must be outside the repository and must not contain tokens,
MFA codes or provider credentials.

The migration upgrade runner expects a disposable database at the actual
parent migration head and synthetic pre-existing records. A from-scratch
migration is complementary and is not a substitute for this upgrade proof.
