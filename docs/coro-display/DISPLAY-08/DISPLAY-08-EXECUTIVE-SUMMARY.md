# DISPLAY-08 — Executive summary

Baseline: `7bdcb085ac71d0d67af59d68a9e6158b4a995de1` (DISPLAY-07 merged). DISPLAY-06/07 already provide the authenticated Gateway, signed manifests, persistent cache, emergency precedence, revocation, durable journal, Chromium loopback origin and supervision contracts.

DISPLAY-08 adds an Ubuntu 24.04 physical-host contract, a fail-closed/idempotent installer, hardened systemd and Chromium policies, bounded hardware telemetry and measurable pilot procedures. It does not install on this Windows host and does not touch a real device.

Software evidence: targeted policy/runtime/resilience tests and installer contract tests pass. Hardware-backed Ed25519, real systemd boot, screen visibility, UPS and 8/24-hour physical endurance remain untested.

Verdicts:

- software: **GO CONDITIONNEL DISPLAY-08-SOFTWARE-READY**, conditional on Draft PR CI and Linux disposable-host validation;
- physical: **NOT_VERIFIED — PHYSICAL PILOT NOT AUTHORIZED**.
