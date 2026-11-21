-- Audit M2-02 : la panique ouvre (ou rejoint) un incident ; lien conservé.
ALTER TABLE "PanicAlert" ADD COLUMN "incidentEventId" TEXT;
CREATE INDEX "PanicAlert_incidentEventId_idx" ON "PanicAlert"("incidentEventId");
