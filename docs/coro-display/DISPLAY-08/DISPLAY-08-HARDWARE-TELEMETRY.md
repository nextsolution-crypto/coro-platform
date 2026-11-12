# Hardware telemetry

New policy accepts OS/Player/Chromium versions, CPU, memory, free disk, optional temperature, restart count, mode and active plan ID. Numeric values are finite/bounded and strings length-limited.

Secrets, email addresses and IP addresses are intentionally not returned by the sanitizer. Server-observed heartbeat time remains distinct from Player-declared health. Temperature is optional and must name its sensor in pilot evidence.

Unit tests prove redaction/bounds. Real sensors and Manager presentation remain **NOT_VERIFIED**.
