-- P-2.3 additive ProjectFile supersession, historical access and expiry reminders.
ALTER TABLE "ProjectFile"
  ADD COLUMN "supersededEffectiveAt" TIMESTAMP(3),
  ADD COLUMN "supersededByFileId" TEXT,
  ADD COLUMN "historicalDownloadAllowedAt" TIMESTAMP(3),
  ADD COLUMN "historicalDownloadAuthorizedById" TEXT,
  ADD COLUMN "historicalDownloadReason" TEXT,
  ADD COLUMN "documentResponsibleUserId" TEXT,
  ADD COLUMN "expiryEscalationUserId" TEXT;

CREATE INDEX "ProjectFile_organizationId_parentId_effectiveAt_idx"
  ON "ProjectFile"("organizationId", "parentId", "effectiveAt");

CREATE TYPE "ProjectFileReminderRecipientKind" AS ENUM ('PRIMARY', 'ESCALATION');
CREATE TYPE "ProjectFileReminderStatus" AS ENUM ('SENT', 'ACKNOWLEDGED', 'CANCELLED');

CREATE TABLE "ProjectFileExpiryReminder" (
  "id" TEXT NOT NULL,
  "projectFileId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "recipientUserId" TEXT NOT NULL,
  "recipientKind" "ProjectFileReminderRecipientKind" NOT NULL,
  "thresholdDays" INTEGER NOT NULL,
  "status" "ProjectFileReminderStatus" NOT NULL DEFAULT 'SENT',
  "notificationId" TEXT,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acknowledgedAt" TIMESTAMP(3),
  "acknowledgedById" TEXT,
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectFileExpiryReminder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectFileExpiryReminder_projectFileId_recipientUserId_recipientKind_thresholdDays_key"
  ON "ProjectFileExpiryReminder"("projectFileId", "recipientUserId", "recipientKind", "thresholdDays");
CREATE INDEX "ProjectFileExpiryReminder_recipientUserId_status_sentAt_idx"
  ON "ProjectFileExpiryReminder"("recipientUserId", "status", "sentAt");
CREATE INDEX "ProjectFileExpiryReminder_organizationId_projectFileId_idx"
  ON "ProjectFileExpiryReminder"("organizationId", "projectFileId");
ALTER TABLE "ProjectFileExpiryReminder"
  ADD CONSTRAINT "ProjectFileExpiryReminder_projectFileId_fkey"
  FOREIGN KEY ("projectFileId") REFERENCES "ProjectFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
