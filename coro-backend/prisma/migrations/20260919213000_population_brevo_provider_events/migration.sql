CREATE TYPE "PopulationDeliveryProviderEventType" AS ENUM (
  'ACCEPTED',
  'DELIVERED',
  'DEFERRED',
  'SOFT_BOUNCE',
  'HARD_BOUNCE',
  'BLOCKED',
  'INVALID',
  'ERROR',
  'SPAM',
  'UNSUBSCRIBED'
);

CREATE TABLE "PopulationDeliveryProviderEvent" (
  "id" TEXT NOT NULL,
  "deliveryId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerMessageId" TEXT NOT NULL,
  "eventType" "PopulationDeliveryProviderEventType" NOT NULL,
  "providerOccurredAt" TIMESTAMP(3) NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "eventFingerprint" TEXT NOT NULL,
  "payloadFingerprint" TEXT NOT NULL,

  CONSTRAINT "PopulationDeliveryProviderEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PopulationDeliveryProviderEvent_eventFingerprint_key"
ON "PopulationDeliveryProviderEvent"("eventFingerprint");

CREATE INDEX "PopulationDeliveryProviderEvent_deliveryId_idx"
ON "PopulationDeliveryProviderEvent"("deliveryId");

CREATE INDEX "PopulationDeliveryProviderEvent_providerMessageId_idx"
ON "PopulationDeliveryProviderEvent"("providerMessageId");

CREATE INDEX "PopulationDeliveryProviderEvent_eventType_idx"
ON "PopulationDeliveryProviderEvent"("eventType");

CREATE INDEX "PopulationDeliveryProviderEvent_providerOccurredAt_idx"
ON "PopulationDeliveryProviderEvent"("providerOccurredAt");

ALTER TABLE "PopulationDeliveryProviderEvent"
ADD CONSTRAINT "PopulationDeliveryProviderEvent_deliveryId_fkey"
FOREIGN KEY ("deliveryId") REFERENCES "PopulationAlertDelivery"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
