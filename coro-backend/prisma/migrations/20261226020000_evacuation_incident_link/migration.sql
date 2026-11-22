-- Audit M5-07 : l'incident ouvre l'évacuation ; lien conservé.
ALTER TABLE "EvacuationEvent" ADD COLUMN "incidentEventId" TEXT;
CREATE INDEX "EvacuationEvent_incidentEventId_idx" ON "EvacuationEvent"("incidentEventId");
