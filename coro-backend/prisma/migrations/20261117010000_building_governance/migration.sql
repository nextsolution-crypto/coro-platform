ALTER TABLE "ClientInvitationEvent" ADD COLUMN "buildingId" TEXT;

CREATE INDEX "ClientInvitationEvent_building_created_idx"
ON "ClientInvitationEvent"("buildingId", "createdAt");

ALTER TABLE "ClientInvitationEvent"
ADD CONSTRAINT "ClientInvitationEvent_buildingId_fkey"
FOREIGN KEY ("buildingId") REFERENCES "Building"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
