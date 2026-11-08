BEGIN;
-- Abort safely if historical active PIN collisions exist; never rewrite identities.
ALTER TABLE "BuildingEmployee" ADD COLUMN "pinEmailStatus" TEXT NOT NULL DEFAULT 'NOT_REQUESTED',
 ADD COLUMN "pinEmailMessageId" TEXT, ADD COLUMN "pinEmailAttemptedAt" TIMESTAMP(3), ADD COLUMN "pinEmailDeliveredAt" TIMESTAMP(3);
ALTER TABLE "OccupancyRecord" ADD COLUMN "checkoutSource" TEXT;
CREATE UNIQUE INDEX "BuildingEmployee_one_active_pin_idx" ON "BuildingEmployee"("buildingId", "pin")
 WHERE "isActive" = true AND "pin" IS NOT NULL;
CREATE INDEX "BuildingEmployee_pinEmailMessageId_idx" ON "BuildingEmployee"("pinEmailMessageId");
COMMIT;
