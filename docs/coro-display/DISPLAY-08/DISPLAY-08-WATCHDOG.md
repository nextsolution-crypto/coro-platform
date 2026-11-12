# Watchdog

Two layers are defined: systemd restart/rate limiting for process exit, and application heartbeat/circuit breaker for Player/Chromium stalls. Emergency/cache state is never deleted during recovery.

The unit deliberately remains `Type=simple`; no unsupported `sd_notify` watchdog claim is made. A future hardware watchdog requires explicit petting semantics, failure tests and evidence that it cannot create a reboot loop.

Software tests cover crash-loop budgeting and restart persistence. Real Node/Chromium kill, frozen process and reboot-loop recovery remain pilot acceptance steps.
