# Power failure

Prepared matrix: short/long outage, interruption during sync, emergency and disk write, then AC return and automatic BIOS boot. Expected behavior is last committed plan/emergency, rejection of partial state, journal verification and reconciliation.

Software evidence covers atomic persistence and restart. It is not equivalent to power removal or filesystem-cache loss.

No physical power cut was performed. Results: controlled software restart PASS from prior DISPLAY evidence; hard power loss, AC restore and emergency-on-power-loss **NOT_VERIFIED**.
