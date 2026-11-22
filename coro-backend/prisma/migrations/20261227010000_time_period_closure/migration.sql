-- Clôture mensuelle des saisies de temps (audit M6-02)
CREATE TABLE "TimePeriodClosure" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedByUserId" TEXT NOT NULL,
  "reopenedAt" TIMESTAMP(3),
  "reopenedByUserId" TEXT,
  "reopenReason" TEXT,
  "closeCount" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TimePeriodClosure_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TimePeriodClosure_period_check" CHECK ("period" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$')
);
CREATE UNIQUE INDEX "TimePeriodClosure_organizationId_period_key" ON "TimePeriodClosure"("organizationId", "period");

CREATE TABLE "TimeEntryCorrection" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "entryType" TEXT NOT NULL,
  "entryId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "reason" TEXT,
  "before" JSONB,
  "after" JSONB,
  "actorUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TimeEntryCorrection_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TimeEntryCorrection_organizationId_period_idx" ON "TimeEntryCorrection"("organizationId", "period");
