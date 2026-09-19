ALTER TABLE "PopulationOperationalEvent"
ADD COLUMN "nextSequence" INTEGER NOT NULL DEFAULT 2;

ALTER TABLE "PopulationOperationalEvent"
ADD CONSTRAINT "PopulationOperationalEvent_nextSequence_check"
CHECK ("nextSequence" >= 2);
