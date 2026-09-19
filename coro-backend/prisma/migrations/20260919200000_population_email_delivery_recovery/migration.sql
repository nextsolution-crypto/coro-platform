ALTER TYPE "PopulationDeliverySuppressionReason" ADD VALUE 'SUBSCRIBER_INACTIVE';
ALTER TYPE "PopulationDeliverySuppressionReason" ADD VALUE 'CHANNEL_DISABLED';
ALTER TYPE "PopulationDeliverySuppressionReason" ADD VALUE 'DESTINATION_CHANGED';

ALTER TABLE "PopulationAlertDelivery"
ADD COLUMN "providerIdempotencyKey" TEXT,
ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastAttemptAt" TIMESTAMP(3),
ADD COLUMN "nextAttemptAt" TIMESTAMP(3),
ADD COLUMN "claimedAt" TIMESTAMP(3),
ADD COLUMN "leaseExpiresAt" TIMESTAMP(3),
ADD COLUMN "outcomeUnknownAt" TIMESTAMP(3);

-- Les deliveries déjà SENDING/FAILED avant CLOSE-03A ne deviennent pas
-- automatiquement admissibles à une nouvelle tentative.
UPDATE "PopulationAlertDelivery"
SET "attemptCount" = 3
WHERE "status" IN ('SENDING', 'FAILED');

CREATE UNIQUE INDEX "PopulationAlertDelivery_providerIdempotencyKey_key"
ON "PopulationAlertDelivery"("providerIdempotencyKey");

CREATE INDEX "PopulationAlertDelivery_status_nextAttemptAt_idx"
ON "PopulationAlertDelivery"("status", "nextAttemptAt");

CREATE INDEX "PopulationAlertDelivery_status_leaseExpiresAt_idx"
ON "PopulationAlertDelivery"("status", "leaseExpiresAt");
