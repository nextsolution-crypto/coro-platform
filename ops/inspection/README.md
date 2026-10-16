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
