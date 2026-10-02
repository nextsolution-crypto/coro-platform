-- PHONE-01A is intentionally additive. Historical values are not backfilled.
ALTER TABLE "PopulationSubscriber"
ADD COLUMN "phoneCanonical" TEXT;

CREATE INDEX "PopulationSubscriber_programId_phoneCanonical_idx"
ON "PopulationSubscriber"("programId", "phoneCanonical");
