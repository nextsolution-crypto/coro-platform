# Production inspection provisioning package

This is a review package, not an authorization to execute production changes.

## Required approvals and inputs

1. Founder approval for production OS-user, sudoers, SSH-key and PostgreSQL-role provisioning.
2. A newly generated, dedicated SSH key pair. Keep the private key outside the server and never print it.
3. A newly generated PostgreSQL password stored only in the root-owned inspection environment.
4. A protected GitHub environment named `production-inspection` with an approved reviewer distinct from the workflow initiator where governance permits.

Do not reuse the deployment SSH identity, database owner, application database role, or any existing private key.

## PostgreSQL read-only authority

Run the following through the approved database-administration path after replacing the role name only if governance requires a different dedicated name. Supply the password through the approved secret channel, never shell history.

```sql
CREATE ROLE coro_inspection_reader LOGIN;
ALTER ROLE coro_inspection_reader SET default_transaction_read_only = on;
ALTER ROLE coro_inspection_reader SET statement_timeout = '15s';
ALTER ROLE coro_inspection_reader SET lock_timeout = '2s';
GRANT CONNECT ON DATABASE coro_db TO coro_inspection_reader;
GRANT USAGE ON SCHEMA public TO coro_inspection_reader;
GRANT SELECT ON TABLE
  public."_prisma_migrations",
  public."Organization",
  public."User"
TO coro_inspection_reader;
DO $$
BEGIN
  IF to_regclass('public."PlatformAuthorityConfiguration"') IS NOT NULL
     AND to_regclass('public."PlatformPermissionGrant"') IS NOT NULL THEN
    GRANT SELECT ON TABLE
      public."PlatformAuthorityConfiguration",
      public."PlatformPermissionGrant"
    TO coro_inspection_reader;
  END IF;
END $$;
```

Re-run only the idempotent conditional `DO` block after migration 138 is
deployed so the dedicated reader receives access to the new authority tables.
If exactly one authority table exists, stop and treat the schema as inconsistent.

Set the password separately using a secret-safe administrative session. Verify `SHOW default_transaction_read_only` returns `on`, a required SELECT succeeds, and an INSERT inside a fresh session is rejected.

## Root-owned configuration

Create `/etc/coro-inspection/inspection.env` as `root:root` mode `0600` with:

```text
CORO_INSPECTION_DB_USER=coro_inspection_reader
CORO_INSPECTION_DB_PASSWORD=<dedicated-secret>
CORO_INSPECTION_DB_NAME=coro_db
CORO_OPERATOR_ORGANIZATION_ID=b07286f6-fe71-4e05-b396-70eba7048684
CORO_FOUNDER_USER_ID=3da94431-55ab-4ab9-86e2-6bcc520e0665
```

Do not place this file in Git or workflow artifacts.

## OS and sudo boundary

From the reviewed release checkout:

```sh
cd /opt/coro-platform/ops/inspection
bash install.sh
sudo bash install.sh --apply
```

Confirm the user is locked, has `/bin/sh` only for OpenSSH forced-command startup, is not in `docker`, and has exactly this sudo authority:

```text
/usr/local/sbin/coro-production-inspect --forced
```

## SSH forced command

Install only the reviewed dedicated public key in the inspection user's `authorized_keys` using:

```text
restrict,command="/usr/local/bin/coro-production-inspection-entrypoint" ssh-ed25519 <dedicated-public-key> coro-production-inspection
```

Use root ownership for installed programs and ensure the inspection user cannot modify its home SSH configuration. Verify the public-key fingerprint out of band with `ssh-keygen -lf` before saving the GitHub secret.

Negative acceptance must reject arbitrary commands, interactive shells, PTY allocation, agent forwarding, port forwarding, generic sudo and direct Docker access.

## GitHub environment

Create the protected `production-inspection` environment and these dedicated secrets:

- `INSPECTION_SERVER_IP`
- `INSPECTION_SSH_PRIVATE_KEY`
- `INSPECTION_SSH_KNOWN_HOSTS`

Record the server host-key fingerprint out of band before storing the complete pinned `known_hosts` line. The workflow is manual-only and has `contents: read` permission.

## Idempotency and non-interference

- Run `install.sh` without `--apply` first on every revision.
- Reapplying installs the same fixed root-owned files and exact sudoers rule.
- Do not change the existing deployment SSH user, key, sudoers, Docker membership, application containers or application database credentials.
- No application restart, migration, backup, restore or deployment is part of provisioning.

## Acceptance sequence

1. Validate root ownership and modes.
2. Validate the locked OS identity and absence of Docker-group membership.
3. Validate exact sudo authority and all negative SSH cases.
4. Validate PostgreSQL SELECT and write rejection.
5. Dispatch the inspection workflow only after GitHub environment review.
6. Confirm the artifact contains no secret pattern and records the phase-aware readiness dimensions.

## Rollback / uninstall

Uninstalling inspection must not touch applications or deployment access:

1. Remove the dedicated public key or inspection user's `authorized_keys` entry.
2. Remove `/etc/sudoers.d/coro-production-inspection` and validate sudoers.
3. Remove the three installed inspection executables/report files.
4. Remove `/etc/coro-inspection/inspection.env` and its directory.
5. Lock or remove only `coro-inspector` after confirming no active session.
6. Revoke and then drop only `coro_inspection_reader` using the approved database-administration path.
7. Remove only the three `production-inspection` GitHub secrets and environment if rollback is permanent.

No production database restore and no application rollback are required because the inspector never mutates application state.
