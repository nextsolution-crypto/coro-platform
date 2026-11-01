# Governed rollback security preflight

The availability of four immutable images is recovery evidence, not authorization to execute them. Before any application rollback, an operator must build an input for `rollback-security-policy.mjs` from the exact reconciled release manifest and current runtime evidence.

Required evidence:

- `previousCommit`, the four exact `previousImages` and `previousMigrationHead` from the checksummed manifest;
- current PostgreSQL migration head;
- identifiers (never values) of the keys required by that backend generation;
- a quiesced worker/outbox state;
- an `APPROVED` entry in `rollback-security-policy.json` that names the same commit and images, the compatible database heads, required key identifiers, reason and review date.

Any missing approval, changed digest, blocked digest, incompatible schema, absent key or running worker fails closed. Image restoration may still cache the four immutable references because it does not execute them. A failed preflight must use roll-forward to a corrected release or an explicitly governed server-side suspension; it must never be bypassed by editing a manifest in place.

The checked-in policy contains no approved production rollback set. Dry-run `41354344585` established that the active manifest's previous backend is the pre-Settings-security image; that exact digest is blocked. This prevents image availability from becoming operational authority.

The only complete application switch is `.github/workflows/production-governed-application-rollback.yml`. It is inert unless `CORO_GOVERNED_ROLLBACK_ENABLED=true`, requires the production environment and `ROLLBACK_APPLICATIONS`, and reruns the authority after workers are stopped. Image restoration does not execute containers. Single-service maintenance may only recover the active backend image captured immediately before its own attempted reconciliation.

Example using sanitized synthetic evidence:

```text
node ops/capacity/rollback-security-policy.mjs rollback-security-input.json
```

Never commit the runtime input if it contains environment or production metadata beyond immutable references and non-secret key identifiers.
