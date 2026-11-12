# Physical architecture

`Gateway → TLS → device identity → external signer → Player → atomic cache/emergency state → loopback origin → sandboxed Chromium → display`.

The Player runs as `coro-display`, not root. The private key is not readable by Player or Chromium: Player sends a bounded payload to an external signer and receives only an Ed25519 signature. Chromium only reaches a random loopback port protected by Host and remote-address checks plus a restrictive CSP.

systemd owns lifecycle; the application owns restart-loop/circuit-breaker and durable emergency rules. Cache, journal and revocation state live under `/var/lib/coro-display`; immutable code under `/opt/coro-display`; configuration under `/etc/coro-display`.

No PAI, Building Bridge, real Ops/Incident machine adapter or production device is connected in DISPLAY-08.
