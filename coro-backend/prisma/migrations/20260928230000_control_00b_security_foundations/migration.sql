ALTER TABLE "User" ADD COLUMN "authVersion" INTEGER NOT NULL DEFAULT 1;

-- Forced re-login: pre-00B durable credentials cannot mint compatible sessions.
DELETE FROM "RefreshToken";
DELETE FROM "TrustedDevice";
ALTER TABLE "RefreshToken" DROP COLUMN "token";
ALTER TABLE "RefreshToken" ADD COLUMN "tokenDigest" TEXT NOT NULL;
ALTER TABLE "RefreshToken" ADD COLUMN "authVersion" INTEGER NOT NULL;
CREATE UNIQUE INDEX "RefreshToken_tokenDigest_key" ON "RefreshToken"("tokenDigest");
ALTER TABLE "TrustedDevice" ADD COLUMN "authVersion" INTEGER NOT NULL;

UPDATE "User" SET "mfaCode" = NULL, "mfaCodeExpiry" = NULL;

CREATE TABLE "PlatformMfaChallenge" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "verifier" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformMfaChallenge_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlatformMfaChallenge_userId_key" ON "PlatformMfaChallenge"("userId");
CREATE INDEX "PlatformMfaChallenge_expiresAt_idx" ON "PlatformMfaChallenge"("expiresAt");
ALTER TABLE "PlatformMfaChallenge" ADD CONSTRAINT "PlatformMfaChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AdminAuditEvent" (
  "id" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "actorDisplayName" TEXT NOT NULL,
  "actorRole" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "targetLabel" TEXT,
  "organizationId" TEXT,
  "reason" TEXT,
  "requestId" TEXT,
  "beforeData" JSONB,
  "afterData" JSONB,
  "schemaVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminAuditEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AdminAuditEvent_actorUserId_createdAt_idx" ON "AdminAuditEvent"("actorUserId", "createdAt");
CREATE INDEX "AdminAuditEvent_targetType_targetId_createdAt_idx" ON "AdminAuditEvent"("targetType", "targetId", "createdAt");
CREATE INDEX "AdminAuditEvent_organizationId_createdAt_idx" ON "AdminAuditEvent"("organizationId", "createdAt");
CREATE INDEX "AdminAuditEvent_requestId_idx" ON "AdminAuditEvent"("requestId");
ALTER TABLE "AdminAuditEvent" ADD CONSTRAINT "AdminAuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION protect_admin_audit_event() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AdminAuditEvent is append-only';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "AdminAuditEvent_append_only" BEFORE UPDATE OR DELETE ON "AdminAuditEvent" FOR EACH ROW EXECUTE FUNCTION protect_admin_audit_event();
