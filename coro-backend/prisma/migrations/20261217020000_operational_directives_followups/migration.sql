-- CreateEnum
CREATE TYPE "OperationalDirectiveType" AS ENUM ('PERMANENT', 'TEMPORARY', 'SHIFT_DIRECTIVE', 'SPECIAL_INSTRUCTION', 'OPERATIONAL_NOTICE');

-- CreateEnum
CREATE TYPE "OperationalDirectivePriority" AS ENUM ('NORMAL', 'IMPORTANT', 'CRITICAL');

-- CreateEnum
CREATE TYPE "OperationalDirectiveStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'PUBLISHED', 'EXPIRED', 'REVOKED', 'SUPERSEDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OperationalDirectiveReceiptStatus" AS ENUM ('TO_REVIEW', 'VIEWED', 'CONFIRMED', 'OVERDUE', 'NOT_APPLICABLE', 'REVOKED');

-- CreateEnum
CREATE TYPE "OperationalFollowUpSource" AS ENUM ('OPERATIONAL_LOG', 'INCIDENT_REPORT', 'INCIDENT_EVENT', 'HANDOVER', 'DIRECTIVE', 'OBSERVATION', 'TECHNICAL_ANOMALY');

-- CreateEnum
CREATE TYPE "OperationalFollowUpStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED', 'CLOSED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PlatformPermission" ADD VALUE 'OPERATIONAL_DIRECTIVE_READ';
ALTER TYPE "PlatformPermission" ADD VALUE 'OPERATIONAL_DIRECTIVE_CREATE';
ALTER TYPE "PlatformPermission" ADD VALUE 'OPERATIONAL_DIRECTIVE_EDIT';
ALTER TYPE "PlatformPermission" ADD VALUE 'OPERATIONAL_DIRECTIVE_REVIEW';
ALTER TYPE "PlatformPermission" ADD VALUE 'OPERATIONAL_DIRECTIVE_APPROVE';
ALTER TYPE "PlatformPermission" ADD VALUE 'OPERATIONAL_DIRECTIVE_PUBLISH';
ALTER TYPE "PlatformPermission" ADD VALUE 'OPERATIONAL_DIRECTIVE_REVOKE';
ALTER TYPE "PlatformPermission" ADD VALUE 'OPERATIONAL_DIRECTIVE_ACKNOWLEDGE';
ALTER TYPE "PlatformPermission" ADD VALUE 'OPERATIONAL_FOLLOWUP_READ';
ALTER TYPE "PlatformPermission" ADD VALUE 'OPERATIONAL_FOLLOWUP_CREATE';
ALTER TYPE "PlatformPermission" ADD VALUE 'OPERATIONAL_FOLLOWUP_ASSIGN';
ALTER TYPE "PlatformPermission" ADD VALUE 'OPERATIONAL_FOLLOWUP_EXECUTE';
ALTER TYPE "PlatformPermission" ADD VALUE 'OPERATIONAL_FOLLOWUP_VERIFY';
ALTER TYPE "PlatformPermission" ADD VALUE 'OPERATIONAL_FOLLOWUP_CLOSE';
ALTER TYPE "PlatformPermission" ADD VALUE 'OPERATIONAL_FOLLOWUP_ADMIN';

-- CreateTable
CREATE TABLE "OperationalDirective" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "zoneLabel" TEXT,
    "securityPost" TEXT,
    "title" TEXT NOT NULL,
    "type" "OperationalDirectiveType" NOT NULL,
    "priority" "OperationalDirectivePriority" NOT NULL DEFAULT 'NORMAL',
    "status" "OperationalDirectiveStatus" NOT NULL DEFAULT 'DRAFT',
    "effectiveAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "targetCriteria" JSONB NOT NULL,
    "acknowledgementRequired" BOOLEAN NOT NULL DEFAULT false,
    "currentVersionNumber" INTEGER NOT NULL DEFAULT 1,
    "lockVersion" INTEGER NOT NULL DEFAULT 0,
    "creationIdempotencyKey" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationalDirective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationalDirectiveVersion" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "directiveId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "targetSnapshot" JSONB NOT NULL,
    "attachments" JSONB,
    "knowledgeReference" JSONB,
    "contentHash" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationalDirectiveVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationalDirectiveReceipt" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "directiveId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "OperationalDirectiveReceiptStatus" NOT NULL DEFAULT 'TO_REVIEW',
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "viewedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "comment" TEXT,
    "reservation" TEXT,
    "lockVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationalDirectiveReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationalFollowUp" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "sourceType" "OperationalFollowUpSource" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "OperationalDirectivePriority" NOT NULL DEFAULT 'NORMAL',
    "responsibleUserId" TEXT,
    "dueAt" TIMESTAMP(3),
    "status" "OperationalFollowUpStatus" NOT NULL DEFAULT 'OPEN',
    "closureValidation" TEXT,
    "completedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "verifiedByUserId" TEXT,
    "lockVersion" INTEGER NOT NULL DEFAULT 0,
    "creationIdempotencyKey" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationalFollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationalFollowUpEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "followUpId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "fromStatus" "OperationalFollowUpStatus",
    "toStatus" "OperationalFollowUpStatus",
    "reason" TEXT,
    "evidence" JSONB,
    "idempotencyKey" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationalFollowUpEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OperationalDirective_organizationId_buildingId_status_prior_idx" ON "OperationalDirective"("organizationId", "buildingId", "status", "priority", "effectiveAt");

-- CreateIndex
CREATE UNIQUE INDEX "OperationalDirective_id_organizationId_key" ON "OperationalDirective"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OperationalDirective_organizationId_creationIdempotencyKey_key" ON "OperationalDirective"("organizationId", "creationIdempotencyKey");

-- CreateIndex
CREATE INDEX "OperationalDirectiveVersion_organizationId_buildingId_creat_idx" ON "OperationalDirectiveVersion"("organizationId", "buildingId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OperationalDirectiveVersion_directiveId_versionNumber_key" ON "OperationalDirectiveVersion"("directiveId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "OperationalDirectiveVersion_id_organizationId_key" ON "OperationalDirectiveVersion"("id", "organizationId");

-- CreateIndex
CREATE INDEX "OperationalDirectiveReceipt_organizationId_buildingId_userI_idx" ON "OperationalDirectiveReceipt"("organizationId", "buildingId", "userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "OperationalDirectiveReceipt_versionId_userId_key" ON "OperationalDirectiveReceipt"("versionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "OperationalDirectiveReceipt_id_organizationId_key" ON "OperationalDirectiveReceipt"("id", "organizationId");

-- CreateIndex
CREATE INDEX "OperationalFollowUp_organizationId_buildingId_status_dueAt_idx" ON "OperationalFollowUp"("organizationId", "buildingId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "OperationalFollowUp_organizationId_responsibleUserId_status_idx" ON "OperationalFollowUp"("organizationId", "responsibleUserId", "status");

-- CreateIndex
CREATE INDEX "OperationalFollowUp_organizationId_sourceType_sourceId_idx" ON "OperationalFollowUp"("organizationId", "sourceType", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "OperationalFollowUp_id_organizationId_key" ON "OperationalFollowUp"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OperationalFollowUp_organizationId_creationIdempotencyKey_key" ON "OperationalFollowUp"("organizationId", "creationIdempotencyKey");

-- CreateIndex
CREATE INDEX "OperationalFollowUpEvent_organizationId_followUpId_occurred_idx" ON "OperationalFollowUpEvent"("organizationId", "followUpId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "OperationalFollowUpEvent_organizationId_idempotencyKey_key" ON "OperationalFollowUpEvent"("organizationId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "OperationalFollowUpEvent_id_organizationId_key" ON "OperationalFollowUpEvent"("id", "organizationId");

-- AddForeignKey
ALTER TABLE "OperationalDirective" ADD CONSTRAINT "OperationalDirective_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalDirective" ADD CONSTRAINT "OperationalDirective_buildingId_organizationId_fkey" FOREIGN KEY ("buildingId", "organizationId") REFERENCES "Building"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalDirective" ADD CONSTRAINT "OperationalDirective_createdByUserId_organizationId_fkey" FOREIGN KEY ("createdByUserId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalDirective" ADD CONSTRAINT "OperationalDirective_approvedByUserId_organizationId_fkey" FOREIGN KEY ("approvedByUserId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalDirectiveVersion" ADD CONSTRAINT "OperationalDirectiveVersion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalDirectiveVersion" ADD CONSTRAINT "OperationalDirectiveVersion_buildingId_organizationId_fkey" FOREIGN KEY ("buildingId", "organizationId") REFERENCES "Building"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalDirectiveVersion" ADD CONSTRAINT "OperationalDirectiveVersion_directiveId_organizationId_fkey" FOREIGN KEY ("directiveId", "organizationId") REFERENCES "OperationalDirective"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalDirectiveVersion" ADD CONSTRAINT "OperationalDirectiveVersion_authorUserId_organizationId_fkey" FOREIGN KEY ("authorUserId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalDirectiveReceipt" ADD CONSTRAINT "OperationalDirectiveReceipt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalDirectiveReceipt" ADD CONSTRAINT "OperationalDirectiveReceipt_buildingId_organizationId_fkey" FOREIGN KEY ("buildingId", "organizationId") REFERENCES "Building"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalDirectiveReceipt" ADD CONSTRAINT "OperationalDirectiveReceipt_directiveId_organizationId_fkey" FOREIGN KEY ("directiveId", "organizationId") REFERENCES "OperationalDirective"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalDirectiveReceipt" ADD CONSTRAINT "OperationalDirectiveReceipt_versionId_organizationId_fkey" FOREIGN KEY ("versionId", "organizationId") REFERENCES "OperationalDirectiveVersion"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalDirectiveReceipt" ADD CONSTRAINT "OperationalDirectiveReceipt_userId_organizationId_fkey" FOREIGN KEY ("userId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalFollowUp" ADD CONSTRAINT "OperationalFollowUp_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalFollowUp" ADD CONSTRAINT "OperationalFollowUp_buildingId_organizationId_fkey" FOREIGN KEY ("buildingId", "organizationId") REFERENCES "Building"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalFollowUp" ADD CONSTRAINT "OperationalFollowUp_createdByUserId_organizationId_fkey" FOREIGN KEY ("createdByUserId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalFollowUp" ADD CONSTRAINT "OperationalFollowUp_responsibleUserId_organizationId_fkey" FOREIGN KEY ("responsibleUserId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalFollowUp" ADD CONSTRAINT "OperationalFollowUp_verifiedByUserId_organizationId_fkey" FOREIGN KEY ("verifiedByUserId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalFollowUpEvent" ADD CONSTRAINT "OperationalFollowUpEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalFollowUpEvent" ADD CONSTRAINT "OperationalFollowUpEvent_buildingId_organizationId_fkey" FOREIGN KEY ("buildingId", "organizationId") REFERENCES "Building"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalFollowUpEvent" ADD CONSTRAINT "OperationalFollowUpEvent_followUpId_organizationId_fkey" FOREIGN KEY ("followUpId", "organizationId") REFERENCES "OperationalFollowUp"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalFollowUpEvent" ADD CONSTRAINT "OperationalFollowUpEvent_actorUserId_organizationId_fkey" FOREIGN KEY ("actorUserId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Published directive versions and receipt confirmations are probative records.
CREATE OR REPLACE FUNCTION "coro_prevent_operational_directive_version_mutation"()
RETURNS trigger AS $$ BEGIN
  RAISE EXCEPTION 'OperationalDirectiveVersion is immutable';
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER "operational_directive_version_immutable"
BEFORE UPDATE OR DELETE ON "OperationalDirectiveVersion"
FOR EACH ROW EXECUTE FUNCTION "coro_prevent_operational_directive_version_mutation"();

CREATE OR REPLACE FUNCTION "coro_prevent_operational_receipt_confirmation_rewrite"()
RETURNS trigger AS $$ BEGIN
  IF OLD."confirmedAt" IS NOT NULL AND (
    NEW."confirmedAt" IS DISTINCT FROM OLD."confirmedAt" OR
    NEW."userId" IS DISTINCT FROM OLD."userId" OR
    NEW."versionId" IS DISTINCT FROM OLD."versionId"
  ) THEN RAISE EXCEPTION 'Confirmed receipt identity and timestamp are immutable';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER "operational_receipt_confirmation_immutable"
BEFORE UPDATE ON "OperationalDirectiveReceipt"
FOR EACH ROW EXECUTE FUNCTION "coro_prevent_operational_receipt_confirmation_rewrite"();
