# Organization document review audit runner

This runner characterizes the review and approval workflow at the explicit
candidate SHA. Its assertions intentionally prove current behaviour, including
security and integrity gaps. It does not modify product code or production.

Run from the repository root:

```powershell
& .\coro-backend\node_modules\.bin\jest.cmd --config .\qa\organization-document-review\jest.config.cjs --runInBand
```

The PostgreSQL and browser portions of the audit are recorded separately in
the audit dossier. A passing characterization test is evidence that the
observed behaviour is reproducible; it is not acceptance of that behaviour.
