# Linux hardening

Dedicated unprivileged account; root-owned immutable application/configuration; mode 0700 writable state/log directories; firewall default deny inbound; outbound allow only DNS, time and CORO Gateway; SSH disabled unless a time-bound maintenance window is approved.

systemd enforces no-new-privileges, private devices/tmp, strict filesystem/home protection, kernel/module/log/control-group protection, namespace/SUID/realtime restrictions, empty capabilities, native syscall architecture and a deny list for mount/reboot/swap/raw/privileged/keyring operations.

Security updates are staged and signed, then applied in a maintenance window with rollback image retained. Automatic feature upgrades are forbidden. Physical ports, BIOS setup and boot order require administrator control.

Firewall, Secure Boot and BIOS settings require real-host evidence and remain **NOT_VERIFIED**.
