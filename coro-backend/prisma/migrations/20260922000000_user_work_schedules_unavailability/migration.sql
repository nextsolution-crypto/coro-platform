ALTER TABLE "User" ADD COLUMN "timeZone" TEXT NOT NULL DEFAULT 'America/Toronto';
ALTER TABLE "User" ADD COLUMN "timeZoneVerified" BOOLEAN NOT NULL DEFAULT false;

CREATE TYPE "UserUnavailabilityType" AS ENUM ('VACATION','SICK','TRAINING','TRAVEL','ADMIN_BLOCK','PERSONAL','OTHER');

CREATE TABLE "UserWorkSchedule" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "timeZone" TEXT NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveUntil" TIMESTAMP(3),
  "verifiedAt" TIMESTAMP(3) NOT NULL,
  "verifiedByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserWorkSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "UserWorkSchedule_verifiedByUserId_fkey" FOREIGN KEY ("verifiedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "UserWorkSchedule_dates_check" CHECK ("effectiveUntil" IS NULL OR "effectiveUntil" > "effectiveFrom")
);
CREATE INDEX "UserWorkSchedule_organizationId_userId_effectiveFrom_idx" ON "UserWorkSchedule"("organizationId","userId","effectiveFrom");

CREATE TABLE "UserWorkScheduleInterval" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "scheduleId" TEXT NOT NULL,
  "dayOfWeek" INTEGER NOT NULL,
  "startTime" INTEGER NOT NULL,
  "endTime" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserWorkScheduleInterval_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "UserWorkSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UserWorkScheduleInterval_day_check" CHECK ("dayOfWeek" BETWEEN 0 AND 6),
  CONSTRAINT "UserWorkScheduleInterval_time_check" CHECK ("startTime" >= 0 AND "startTime" < "endTime" AND "endTime" <= 1440)
);
CREATE INDEX "UserWorkScheduleInterval_scheduleId_dayOfWeek_idx" ON "UserWorkScheduleInterval"("scheduleId","dayOfWeek");

CREATE TABLE "UserUnavailability" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "allDay" BOOLEAN NOT NULL DEFAULT false,
  "localStartDate" DATE,
  "localEndDate" DATE,
  "timeZone" TEXT NOT NULL,
  "type" "UserUnavailabilityType" NOT NULL,
  "privateNote" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "cancelledAt" TIMESTAMP(3),
  "cancelledByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserUnavailability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "UserUnavailability_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "UserUnavailability_cancelledByUserId_fkey" FOREIGN KEY ("cancelledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "UserUnavailability_interval_check" CHECK ("startAt" < "endAt"),
  CONSTRAINT "UserUnavailability_allDay_check" CHECK (("allDay" = false AND "localStartDate" IS NULL AND "localEndDate" IS NULL) OR ("allDay" = true AND "localStartDate" IS NOT NULL AND "localEndDate" > "localStartDate"))
);
CREATE INDEX "UserUnavailability_organizationId_userId_startAt_endAt_idx" ON "UserUnavailability"("organizationId","userId","startAt","endAt");
