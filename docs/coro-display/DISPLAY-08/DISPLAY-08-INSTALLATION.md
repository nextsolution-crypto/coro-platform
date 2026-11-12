# Installation

Artifact: `ops/display-player/install.sh`. It validates Ubuntu 24.04/x86-64, root only for installation, memory/disk, Node, Chromium, systemd, the packaged Player, external signer and protected environment file before mutation.

`--dry-run` prints intended mutations. Default installation does not enable the service; `--enable` is reserved for accepted enrollment. Repeated file/directory installation is deterministic. No download pipe, credential or private key is embedded.

Rollback: `uninstall.sh` disables/removes code and policy but preserves configuration, identity, cache and audit. `--purge-data` deliberately refuses automatic erasure; device revocation and evidence retention precede any explicit removal.

Host execution: **NOT_EXECUTED** (Windows host and no authorized mini-PC). Disposable Linux validation remains a PR gate.
