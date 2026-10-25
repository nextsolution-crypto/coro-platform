-- Add the governed, user-initiated password-change event to the existing
-- append-only client security audit authority.
ALTER TABLE "ClientSecurityAuditEvent"
  DROP CONSTRAINT "ClientSecurityAuditEvent_eventType_check";

ALTER TABLE "ClientSecurityAuditEvent"
  ADD CONSTRAINT "ClientSecurityAuditEvent_eventType_check"
  CHECK (
    "eventType" IN (
      'PASSWORD_RESET_REQUESTED',
      'PASSWORD_RESET_COMPLETED',
      'PASSWORD_CHANGED'
    )
  );
