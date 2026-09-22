-- Existing buildings receive a compatibility timezone, not a verified geographic assertion.
-- Their actual timezone must be confirmed; province alone is insufficient.
ALTER TABLE "Building" ADD COLUMN "timeZone" TEXT NOT NULL DEFAULT 'America/Toronto';
ALTER TABLE "Building" ADD COLUMN "timeZoneVerified" BOOLEAN NOT NULL DEFAULT false;
