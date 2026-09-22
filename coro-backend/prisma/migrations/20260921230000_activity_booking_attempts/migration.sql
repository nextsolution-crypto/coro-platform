BEGIN;

ALTER TABLE "ProjectActivity"
  ADD COLUMN "clientVisible" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "clientBookable" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Booking" ADD COLUMN "activityId" TEXT;

-- Abort rather than attach a legacy link to a different project or tenant.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "ProjectActivity" a
    JOIN "Booking" b ON b.id = a."bookingId"
    WHERE a."projectId" <> b."projectId"
       OR a."organizationId" <> b."organizationId"
  ) THEN
    RAISE EXCEPTION 'Incompatible legacy ProjectActivity.bookingId links; reconcile before migration';
  END IF;
END $$;

UPDATE "Booking" b SET "activityId" = a.id
FROM "ProjectActivity" a WHERE a."bookingId" = b.id;

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_activityId_fkey"
  FOREIGN KEY ("activityId") REFERENCES "ProjectActivity"(id)
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Booking_activityId_idx" ON "Booking"("activityId");
CREATE UNIQUE INDEX "Booking_one_open_per_activity_idx" ON "Booking"("activityId")
  WHERE "activityId" IS NOT NULL AND status IN ('DEMANDEE', 'CONFIRMEE', 'REPORTEE', 'REASSIGNEE');

ALTER TABLE "ProjectActivity" ADD CONSTRAINT "ProjectActivity_bookable_visible_check"
  CHECK (NOT "clientBookable" OR "clientVisible");

ALTER TABLE "ProjectActivity" DROP CONSTRAINT "ProjectActivity_bookingId_fkey";
DROP INDEX "ProjectActivity_bookingId_key";
ALTER TABLE "ProjectActivity" DROP COLUMN "bookingId";

COMMIT;
