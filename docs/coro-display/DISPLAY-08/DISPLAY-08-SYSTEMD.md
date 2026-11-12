# systemd

Unit: `ops/display-player/systemd/coro-display-player.service`. It starts after network-online and graphical targets, uses the dedicated account, executes preflight, restarts only on failure with start-rate limiting, and provides a bounded graceful stop.

The unit is `Type=simple`: the current Node process does not emit `sd_notify`, so the document does not claim a systemd watchdog it cannot satisfy. Application watchdog/circuit-breaker tests remain authoritative. A future `Type=notify` change requires an implemented readiness/watchdog protocol and tests.

`systemd-analyze verify` is required on the target Ubuntu image. Persistent installation and real boot/restart are **NOT_VERIFIED**.
