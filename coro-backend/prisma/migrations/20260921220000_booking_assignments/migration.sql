CREATE TYPE "BookingAssignmentRole" AS ENUM ('LEAD', 'SUPPORT');
CREATE TYPE "BookingAssignmentStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'REPLACED', 'REMOVED');

CREATE TABLE "BookingAssignment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "BookingAssignmentRole" NOT NULL,
    "status" "BookingAssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "assignedByUserId" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "declineReason" TEXT,
    "replacedByAssignmentId" TEXT,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BookingAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BookingAssignment_replacedByAssignmentId_key" ON "BookingAssignment"("replacedByAssignmentId");
CREATE INDEX "BookingAssignment_bookingId_status_idx" ON "BookingAssignment"("bookingId", "status");
CREATE INDEX "BookingAssignment_userId_status_idx" ON "BookingAssignment"("userId", "status");
CREATE UNIQUE INDEX "BookingAssignment_one_active_lead" ON "BookingAssignment"("bookingId")
  WHERE "role" = 'LEAD' AND "status" IN ('PENDING', 'ACCEPTED');
CREATE UNIQUE INDEX "BookingAssignment_unique_active_person_role" ON "BookingAssignment"("bookingId", "userId", "role")
  WHERE "status" IN ('PENDING', 'ACCEPTED');

ALTER TABLE "BookingAssignment" ADD CONSTRAINT "BookingAssignment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BookingAssignment" ADD CONSTRAINT "BookingAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BookingAssignment" ADD CONSTRAINT "BookingAssignment_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BookingAssignment" ADD CONSTRAINT "BookingAssignment_replacedByAssignmentId_fkey" FOREIGN KEY ("replacedByAssignmentId") REFERENCES "BookingAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Prisma's UUID default is application-side. Existing SQL migrations use
-- gen_random_uuid() for database-created rows; cast preserves the TEXT key.
INSERT INTO "BookingAssignment" (
  "id", "bookingId", "userId", "role", "status", "assignedAt",
  "respondedAt", "createdAt", "updatedAt"
)
SELECT gen_random_uuid()::text, b."id", b."assignedUserId", 'LEAD'::"BookingAssignmentRole", 'ACCEPTED'::"BookingAssignmentStatus",
       b."createdAt", b."createdAt", b."createdAt", b."updatedAt"
FROM "Booking" b
WHERE b."assignedUserId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "BookingAssignment" a
    WHERE a."bookingId" = b."id" AND a."role" = 'LEAD'
  )
ON CONFLICT DO NOTHING;
