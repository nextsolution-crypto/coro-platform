CREATE TYPE "NetworkActorType" AS ENUM ('INTERNAL_USER', 'CLIENT_USER');
CREATE TYPE "AuditActorType" AS ENUM ('INTERNAL_USER', 'CLIENT_USER', 'SYSTEM');

ALTER TABLE "CustomerPortfolioAssignment"
  ADD COLUMN "grantedByActorType" "NetworkActorType" NOT NULL DEFAULT 'INTERNAL_USER',
  ADD COLUMN "grantedByClientUserId" TEXT,
  ADD COLUMN "revokedByActorType" "NetworkActorType",
  ADD COLUMN "revokedByClientUserId" TEXT,
  ALTER COLUMN "grantedByUserId" DROP NOT NULL;

ALTER TABLE "AdminAuditEvent"
  ADD COLUMN "actorType" "AuditActorType" NOT NULL DEFAULT 'INTERNAL_USER',
  ADD COLUMN "actorClientUserId" TEXT,
  ADD COLUMN "systemActorKey" TEXT,
  ALTER COLUMN "actorUserId" DROP NOT NULL;

ALTER TABLE "CustomerPortfolioAssignment"
  ADD CONSTRAINT "CustomerPortfolioAssignment_granted_actor_check" CHECK (
    ("grantedByActorType" = 'INTERNAL_USER' AND "grantedByUserId" IS NOT NULL AND "grantedByClientUserId" IS NULL) OR
    ("grantedByActorType" = 'CLIENT_USER' AND "grantedByUserId" IS NULL AND "grantedByClientUserId" IS NOT NULL)
  ),
  ADD CONSTRAINT "CustomerPortfolioAssignment_revoked_actor_check" CHECK (
    ("revokedAt" IS NULL AND "revokedByActorType" IS NULL AND "revokedByUserId" IS NULL AND "revokedByClientUserId" IS NULL) OR
    ("revokedAt" IS NOT NULL AND "revokedByActorType" = 'INTERNAL_USER' AND "revokedByUserId" IS NOT NULL AND "revokedByClientUserId" IS NULL) OR
    ("revokedAt" IS NOT NULL AND "revokedByActorType" = 'CLIENT_USER' AND "revokedByUserId" IS NULL AND "revokedByClientUserId" IS NOT NULL)
  );

ALTER TABLE "AdminAuditEvent"
  ADD CONSTRAINT "AdminAuditEvent_actor_check" CHECK (
    ("actorType" = 'INTERNAL_USER' AND "actorUserId" IS NOT NULL AND "actorClientUserId" IS NULL AND "systemActorKey" IS NULL) OR
    ("actorType" = 'CLIENT_USER' AND "actorUserId" IS NULL AND "actorClientUserId" IS NOT NULL AND "systemActorKey" IS NULL) OR
    ("actorType" = 'SYSTEM' AND "actorUserId" IS NULL AND "actorClientUserId" IS NULL AND "systemActorKey" IS NOT NULL)
  );

ALTER TABLE "CustomerPortfolioAssignment" ADD CONSTRAINT "CustomerPortfolioAssignment_grantedByClientUserId_fkey" FOREIGN KEY ("grantedByClientUserId") REFERENCES "ClientUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerPortfolioAssignment" ADD CONSTRAINT "CustomerPortfolioAssignment_revokedByClientUserId_fkey" FOREIGN KEY ("revokedByClientUserId") REFERENCES "ClientUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdminAuditEvent" ADD CONSTRAINT "AdminAuditEvent_actorClientUserId_fkey" FOREIGN KEY ("actorClientUserId") REFERENCES "ClientUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "CustomerPortfolioAssignment_grantedByClientUserId_createdAt_idx" ON "CustomerPortfolioAssignment"("grantedByClientUserId", "createdAt");
CREATE INDEX "CustomerPortfolioAssignment_revokedByClientUserId_revokedAt_idx" ON "CustomerPortfolioAssignment"("revokedByClientUserId", "revokedAt");
CREATE INDEX "AdminAuditEvent_actorClientUserId_createdAt_idx" ON "AdminAuditEvent"("actorClientUserId", "createdAt");
