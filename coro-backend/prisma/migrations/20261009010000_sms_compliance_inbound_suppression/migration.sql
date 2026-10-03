CREATE TYPE "PopulationInboundSmsEventType" AS ENUM ('STOP', 'HELP', 'REPLY', 'SUBSCRIBE', 'UNSUBSCRIBE');
CREATE TYPE "PopulationSmsSuppressionReason" AS ENUM ('PROVIDER_STOP', 'PROVIDER_UNSUBSCRIBE');
ALTER TYPE "PopulationDeliverySuppressionReason" ADD VALUE 'GLOBAL_SMS_SUPPRESSION';

CREATE TABLE "PopulationInboundSmsEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerEventKey" TEXT NOT NULL,
    "eventType" "PopulationInboundSmsEventType" NOT NULL,
    "phoneCanonical" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "providerOccurredAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payloadFingerprint" TEXT NOT NULL,
    "deliveryId" TEXT,
    CONSTRAINT "PopulationInboundSmsEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PopulationSmsSuppression" (
    "id" TEXT NOT NULL,
    "phoneCanonical" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "reason" "PopulationSmsSuppressionReason" NOT NULL,
    "source" TEXT NOT NULL,
    "suppressedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "originEventId" TEXT NOT NULL,
    CONSTRAINT "PopulationSmsSuppression_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PopulationInboundSmsEvent_providerEventKey_key" ON "PopulationInboundSmsEvent"("providerEventKey");
CREATE INDEX "PopulationInboundSmsEvent_phoneCanonical_idx" ON "PopulationInboundSmsEvent"("phoneCanonical");
CREATE INDEX "PopulationInboundSmsEvent_providerMessageId_idx" ON "PopulationInboundSmsEvent"("providerMessageId");
CREATE INDEX "PopulationInboundSmsEvent_deliveryId_idx" ON "PopulationInboundSmsEvent"("deliveryId");
CREATE INDEX "PopulationInboundSmsEvent_providerOccurredAt_idx" ON "PopulationInboundSmsEvent"("providerOccurredAt");
CREATE UNIQUE INDEX "PopulationSmsSuppression_phoneCanonical_key" ON "PopulationSmsSuppression"("phoneCanonical");
CREATE UNIQUE INDEX "PopulationSmsSuppression_originEventId_key" ON "PopulationSmsSuppression"("originEventId");
CREATE INDEX "PopulationSmsSuppression_suppressedAt_idx" ON "PopulationSmsSuppression"("suppressedAt");

ALTER TABLE "PopulationInboundSmsEvent" ADD CONSTRAINT "PopulationInboundSmsEvent_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "PopulationAlertDelivery"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PopulationSmsSuppression" ADD CONSTRAINT "PopulationSmsSuppression_originEventId_fkey" FOREIGN KEY ("originEventId") REFERENCES "PopulationInboundSmsEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
