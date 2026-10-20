# Security review

- Production hosts, port 3002 and external-provider credentials are rejected.
- Passwords and MFA-channel credentials are absent from Git.
- The D: secret store is marked QA-only and restricted to the current Windows user and SYSTEM.
- MFA remains enabled and canonically validated; the adapter only replaces delivery.
- Challenges are single-consumption and removed after retrieval.
- Sessions are actor-specific and never shared across tenants.
- Revoked/inactive users fail closed.
- Network isolation and provider egress denial are mandatory preflight evidence.
- WebAuthn PRF is not simulated and remains NOT_VERIFIED without the approved real environment.

Residual risk: Windows ACL and Docker isolation are host controls; the preflight must rerun on each workstation and fresh stack.
