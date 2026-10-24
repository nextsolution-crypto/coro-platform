-- Preserve every historical ProjectComment as an internal-author comment while
-- adding a distinct, canonical ClientUser provenance path for portal comments.
ALTER TABLE "ProjectComment"
  ADD COLUMN "actorType" "AuditActorType" NOT NULL DEFAULT 'INTERNAL_USER',
  ADD COLUMN "clientUserId" TEXT,
  ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "ProjectComment"
  DROP CONSTRAINT "ProjectComment_userId_fkey";

ALTER TABLE "ProjectComment"
  ADD CONSTRAINT "ProjectComment_userId_organizationId_fkey"
  FOREIGN KEY ("userId", "organizationId") REFERENCES "User"("id", "organizationId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProjectComment"
  ADD CONSTRAINT "ProjectComment_clientUserId_fkey"
  FOREIGN KEY ("clientUserId", "organizationId") REFERENCES "ClientUser"("id", "organizationId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProjectComment"
  ADD CONSTRAINT "ProjectComment_exactly_one_actor_check"
  CHECK (
    ("actorType" = 'INTERNAL_USER' AND "userId" IS NOT NULL AND "clientUserId" IS NULL)
    OR
    ("actorType" = 'CLIENT_USER' AND "userId" IS NULL AND "clientUserId" IS NOT NULL)
  );

CREATE INDEX "ProjectComment_clientUserId_createdAt_idx"
  ON "ProjectComment"("clientUserId", "createdAt");
