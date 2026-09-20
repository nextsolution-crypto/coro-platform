ALTER TABLE "PopulationAlert"
ADD COLUMN "clientIntentId" TEXT;

ALTER TABLE "PopulationAlertDelivery"
ADD COLUMN "providerCallStartedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "PopulationAlert_operationalEventId_clientIntentId_key"
ON "PopulationAlert"("operationalEventId", "clientIntentId");

CREATE INDEX "PopulationAlertDelivery_status_providerCallStartedAt_idx"
ON "PopulationAlertDelivery"("status", "providerCallStartedAt");
