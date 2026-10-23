# CORO AI - AWS preparation (inactive)

This overlay prepares the backend for IAM Roles Anywhere without embedding a
certificate, private key, or long-lived AWS credential in an image or in Git.
The standard deployment does not load the overlay and continues to use the
deterministic simulated provider.

The backend image is glibc-based so the host-provisioned
`aws_signing_helper` can be mounted read-only and invoked by the AWS SDK
`credential_process` configured in `/etc/coro-ai/aws-config`.

Activation requires a separate governed operation that:

1. verifies the profile `coro-ai-production` and helper path on the host;
2. verifies the model `ca.amazon.nova-lite-v1:0` and region `ca-central-1`;
   the approved Roles Anywhere session duration is exactly 900 seconds;
3. mounts `/etc/coro-ai` and the helper read-only;
4. sets `CORO_AI_PROVIDER=bedrock` and
   `CORO_AI_BEDROCK_INVOCATION_ENABLED=true`;
5. performs an explicitly approved, non-sensitive invocation test.

No model invocation is part of this change or its automated tests.
The approved Canadian cross-region inference profile can process within the two
Canadian regions; CORO still addresses Bedrock through `ca-central-1` only.
