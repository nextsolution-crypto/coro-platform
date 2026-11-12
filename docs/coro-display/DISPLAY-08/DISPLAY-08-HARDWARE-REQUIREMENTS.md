# Hardware requirements

Minimum accepted by preflight: x86-64, 4 GiB RAM, 16 GiB free persistent storage, supported Chromium, Ethernet, HDMI or DisplayPort, and a proven external Ed25519 PKCS#11 signer. Recommended pilot: 8 GiB RAM, 128 GiB NVMe, wired 1 GbE, TPM 2.0, VESA mount, Kensington lock, BIOS power-on-after-AC-loss and vendor-supported Ubuntu 24.04.

TPM presence is evidence for measured boot/sealing only; it is not evidence that the TPM can generate/sign Ed25519. The exact SKU must demonstrate the signer capability before enrollment.

Screen requirements: native 1920×1080 or 1920×1200 for 16:9/16:10, or a validated 17:11 canvas; non-scaling `contain`, adequate mounting, viewing angle and luminance must be measured physically. Ethernet is primary; Wi-Fi is a governed fallback.

Canadian availability, price, lifecycle commitment and replacement lead time are **NOT_VERIFIED** until a dated supplier quote is obtained.
