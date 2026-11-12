# Endurance

The `summarizeEndurance` policy requires at least two ordered measured samples and reports duration, peak CPU/RAM, minimum free disk, restart and error deltas. It cannot label a requested duration as executed.

Plan: sample every minute; record cycles, heartbeats, syncs, reconnections, Chromium/Player restarts and temperature where trusted. Acceptance requires no blank render, ungoverned mode change or monotonic resource leak.

Automated unit evidence passes. Physical 1 h, 8 h and 24 h runs: **NOT_EXECUTED / NOT_VERIFIED**. No endurance PASS is claimed.
