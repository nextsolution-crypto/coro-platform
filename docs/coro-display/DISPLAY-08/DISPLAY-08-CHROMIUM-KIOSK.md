# Chromium kiosk

Runtime flags require `--kiosk` and reject `--no-sandbox`, remote debugging, proxy injection, insecure certificates/web security and extension loading. Managed policy disables sign-in/sync, DevTools, downloads, printing, password manager, popups and every extension.

The application is served only on loopback; navigation interception blocks every foreign origin. CSP denies defaults, objects, frames, forms and external connections. The render uses `object-fit: contain` and no script is required.

Headless Chromium tests prove rendering/security contracts, not a physical kiosk session. Address-bar absence, OS escape paths, real input devices and GPU/display driver behavior remain physical-pilot checks.
