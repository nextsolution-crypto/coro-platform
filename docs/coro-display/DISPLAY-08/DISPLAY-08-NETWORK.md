# Network

Primary interface: wired DHCP with controlled DNS/NTP and TLS to the CORO Gateway. Wi-Fi, if enabled, is a separately managed fallback and stores credentials outside Git. No inbound public listener exists; the render origin binds loopback only.

Loss behavior: keep the last verified non-revoked plan and emergency state, append durable events, back off retries, and reconcile commands/heartbeats on return. IP changes do not alter device identity.

Software tests cover offline/reconnect, Gateway failure, host rebinding and loopback. Real Ethernet/Wi-Fi roaming, latency and certificate-chain behavior on the selected image remain physical-pilot work.
