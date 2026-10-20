# CORO QA Identity Lab — Architecture

The Identity Lab extends `qa/global-e2e`; it does not create another authentication authority. Disposable PostgreSQL records use `@global-e2e.test`, production endpoints and port 3002 are rejected, and every browser actor receives an isolated context or temporary profile.

Flow: restricted D:-scoped secret store → canonical backend password challenge → canonical MFA challenge → restricted QA capture directory → authenticated loopback MFA adapter → canonical MFA verification → actor-scoped browser session. The adapter consumes and deletes each capture file and never logs the code.

The mandatory preflight checks CORS compatibility, MFA-adapter readiness, Chrome availability, the nine-actor catalogue and deny-by-default network evidence before a browser matrix starts. The October 20 failure was a CORS origin mismatch (`127.0.0.1:3011` versus the canonical QA origin), not a password, identity or MFA failure.

WebAuthn PRF remains a separate hardware-bound gate; this lab does not emulate it.
