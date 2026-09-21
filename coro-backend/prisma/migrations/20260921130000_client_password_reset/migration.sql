ALTER TABLE "ClientUser" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "ClientPasswordResetToken" (
    "id" TEXT NOT NULL,
    "clientUserId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    CONSTRAINT "ClientPasswordResetToken_tokenHash_format" CHECK ("tokenHash" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "ClientPasswordResetToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ClientPasswordResetToken_tokenHash_key" ON "ClientPasswordResetToken"("tokenHash");
CREATE INDEX "ClientPasswordResetToken_clientUserId_createdAt_idx" ON "ClientPasswordResetToken"("clientUserId", "createdAt");
ALTER TABLE "ClientPasswordResetToken" ADD CONSTRAINT "ClientPasswordResetToken_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "ClientUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ClientSecurityAuditEvent" (
    "id" TEXT NOT NULL,
    "clientUserId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientSecurityAuditEvent_eventType_check" CHECK ("eventType" IN ('PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_COMPLETED')),
    CONSTRAINT "ClientSecurityAuditEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ClientSecurityAuditEvent_clientUserId_occurredAt_idx" ON "ClientSecurityAuditEvent"("clientUserId", "occurredAt");
CREATE INDEX "ClientSecurityAuditEvent_organizationId_occurredAt_idx" ON "ClientSecurityAuditEvent"("organizationId", "occurredAt");
ALTER TABLE "ClientSecurityAuditEvent" ADD CONSTRAINT "ClientSecurityAuditEvent_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "ClientUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION protect_client_security_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'ClientSecurityAuditEvent is append-only'; END $$;
CREATE TRIGGER client_security_audit_append_only BEFORE UPDATE OR DELETE ON "ClientSecurityAuditEvent"
FOR EACH ROW EXECUTE FUNCTION protect_client_security_audit();
