CREATE TYPE "ProjectFileLifecycleState" AS ENUM ('DRAFT', 'REVIEW', 'APPROVED', 'SUPERSEDED', 'REVOKED');

ALTER TABLE "ProjectFile"
  ADD COLUMN "lifecycleState" "ProjectFileLifecycleState",
  ADD COLUMN "sha256" TEXT,
  ADD COLUMN "reviewRequestedAt" TIMESTAMP(3),
  ADD COLUMN "reviewRequestedById" TEXT,
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "approvedById" TEXT,
  ADD COLUMN "effectiveAt" TIMESTAMP(3),
  ADD COLUMN "expiresAt" TIMESTAMP(3),
  ADD COLUMN "supersededAt" TIMESTAMP(3),
  ADD COLUMN "supersededById" TEXT,
  ADD COLUMN "revokedAt" TIMESTAMP(3),
  ADD COLUMN "revokedById" TEXT,
  ADD COLUMN "revocationReason" TEXT,
  ADD COLUMN "lockVersion" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "ProjectFileLifecycleEvent" (
  "id" TEXT NOT NULL,
  "projectFileId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "fromState" "ProjectFileLifecycleState",
  "toState" "ProjectFileLifecycleState" NOT NULL,
  "actorType" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "reason" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectFileLifecycleEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectFileLifecycleEvent_projectFileId_requestId_key"
  ON "ProjectFileLifecycleEvent"("projectFileId", "requestId");
CREATE INDEX "ProjectFile_organizationId_projectId_lifecycleState_idx"
  ON "ProjectFile"("organizationId", "projectId", "lifecycleState");
CREATE INDEX "ProjectFile_expiresAt_idx" ON "ProjectFile"("expiresAt");
CREATE INDEX "ProjectFileLifecycleEvent_organizationId_projectId_createdAt_idx"
  ON "ProjectFileLifecycleEvent"("organizationId", "projectId", "createdAt");

ALTER TABLE "ProjectFileLifecycleEvent"
  ADD CONSTRAINT "ProjectFileLifecycleEvent_projectFileId_fkey"
  FOREIGN KEY ("projectFileId") REFERENCES "ProjectFile"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
