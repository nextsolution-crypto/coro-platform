# Pilot operations runbook

1. Verify approved hardware/image checksum and isolated pilot tenant/site.
2. Install with `--dry-run`; inspect; install disabled.
3. Generate key in external provider; enroll by one-time invitation; verify fingerprint/assignment.
4. Run preflight, enable service, verify signed heartbeat and cached approved plan.
5. Execute only synthetic scenarios; record Manager and independent screen observation.
6. On anomaly, preserve state/journal, engage STOP, keep last valid plan, and do not clear emergency without authorized command.
7. Updates use signed artifact, preflight, maintenance window, retained rollback and post-update health check.
8. Retirement revokes device first, exports audit, disables service, removes code, then securely erases state under a separate approved procedure.

No production, PAI, Building Bridge, SMS or email action is included.
