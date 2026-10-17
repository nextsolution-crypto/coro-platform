# Governed production inspection

This directory defines the production inspection boundary. It does not provision production by itself.

## Security model

- GitHub connects with a dedicated `coro-inspector` SSH identity.
- OpenSSH forces the root-owned `/usr/local/bin/coro-production-inspection-entrypoint`, which accepts only the literal remote command `inspect`, and rejects forwarding and PTY allocation.
- Sudo permits only that root-owned collector with the fixed `--forced` argument and no caller-controlled environment.
- The inspector never exposes the Docker socket to the SSH identity.
- PostgreSQL queries use a dedicated login whose default transaction mode is read-only and whose grants are limited to the inspection projections.
- The entrypoint rejects every command except literal `inspect`; the collector accepts only the fixed internal `--forced` argument, uses fixed paths, and emits sanitized JSON only.

Production provisioning requires separate Founder authorization. Run `install.sh` without `--apply` to inspect the exact plan. The apply mode intentionally refuses to create database credentials; a reviewed root-readable environment file and the separately provisioned database role must already exist.

## Files

- `coro-production-inspect`: fixed forced-command entry point.
- `inspection-report.mjs`: validates and sanitizes collected evidence.
- `install.sh`: fail-closed, dry-run-first provisioning plan.
- `inspection-security.test.mjs`: permanent security and report-policy regression tests.

## Required server files

- `/etc/coro-inspection/inspection.env`, root-owned mode `0600`.
- `/usr/local/bin/coro-production-inspection-entrypoint`, root-owned mode `0755`.
- `/usr/local/libexec/coro/inspection-report.mjs`, root-owned and not writable by the inspection user.
- `/usr/local/sbin/coro-production-inspect`, root-owned mode `0755`.

The environment file contains only the dedicated read-only database connection values and existing backup object verification configuration. Its values must never be printed.

## Phase-aware result

The report keeps five independent dimensions:

- `inspectionExecution`: whether trustworthy evidence was collected and evaluated.
- `platformAuthorityState`: `UNCONFIGURED`, `DRAFT`, `ACTIVE`, `INVALID`, or `NOT_VERIFIED`.
- `releaseReadiness`: production evidence integrity (`GO`, `NO_GO`, or `UNKNOWN`).
- `bootstrapReadiness`: whether DRAFT can be created, already exists, or activation has already completed.
- `mainFreezeReadiness`: `READY` only when authority is `ACTIVE` and every other gate passes.

Valid `UNCONFIGURED` and `DRAFT` evidence can therefore pass inspection without being misreported as final Main Freeze readiness.

When the Platform Authority schema is available, sanitized database evidence also includes the canonical record count and the `PRIMARY` record identity, state, Founder/operator bindings, and non-negative integer `lockVersion`. The report fails closed if the record is missing inconsistently, duplicated, non-canonical, in an unexpected state, or carries an invalid lock version. The value is read inside the existing fixed `BEGIN READ ONLY` transaction and is associated with the report's `generatedAt` timestamp; no additional database privilege or application endpoint is required.
