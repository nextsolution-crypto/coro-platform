# OS selection

Reference: **Ubuntu 24.04.5 LTS x86-64**, minimal installation, fully patched before enrollment. Ubuntu 24.04.5 was released 2026-09-10 and the 24.04 line has standard support through 2029.

| Option | Result |
|---|---|
| Ubuntu LTS | selected: systemd, Chromium, TPM2/PKCS#11 ecosystem, unattended security metadata and reproducible automation |
| Windows IoT Enterprise | viable alternate, but requires a distinct CNG/service/kiosk implementation and licensing validation |
| dedicated kiosk distribution | rejected for V1 because CORO needs controlled Node runtime, signer integration, journaling and existing Linux runbooks |

The installer checks `ID=ubuntu`, `VERSION_ID=24.04` and `x86_64`; it fails rather than guessing compatibility. Kernel/HWE revisions are recorded at pilot acceptance, not pinned in application source.
