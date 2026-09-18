CREATE TYPE "PopulationDeliveryMode" AS ENUM ('SANDBOX', 'LIVE');
CREATE TYPE "PopulationGovernanceMode" AS ENUM ('STANDARD', 'DUAL_CONTROL');
CREATE TYPE "PopulationPermission" AS ENUM ('POPULATION_PREPARE', 'POPULATION_APPROVE', 'POPULATION_SEND');
CREATE TYPE "PopulationDeliverySuppressionReason" AS ENUM ('SYNTHETIC_RECIPIENT', 'SANDBOX_MODE');

ALTER TYPE "PopulationDeliveryStatus" ADD VALUE 'SUPPRESSED';

ALTER TABLE "ClientUser"
ADD COLUMN "populationPermissions" "PopulationPermission"[] NOT NULL DEFAULT ARRAY[]::"PopulationPermission"[];

ALTER TABLE "PopulationProgram"
ADD COLUMN "deliveryMode" "PopulationDeliveryMode" NOT NULL DEFAULT 'SANDBOX',
ADD COLUMN "governanceMode" "PopulationGovernanceMode" NOT NULL DEFAULT 'STANDARD';

ALTER TABLE "PopulationSubscriber"
ADD COLUMN "isSynthetic" BOOLEAN NOT NULL DEFAULT false;

UPDATE "PopulationSubscriber"
SET "isSynthetic" = true
WHERE "id" IN (
  'demo-premont-population-subscriber-a',
  'demo-premont-population-subscriber-b',
  'demo-premont-population-subscriber-c'
);

ALTER TABLE "PopulationAlert"
ADD COLUMN "readyByType" "CoroActorType",
ADD COLUMN "readyById" TEXT,
ADD COLUMN "readyAt" TIMESTAMP(3),
ADD COLUMN "frozenByType" "CoroActorType",
ADD COLUMN "frozenById" TEXT,
ADD COLUMN "sentByType" "CoroActorType",
ADD COLUMN "sentById" TEXT,
ADD COLUMN "cancelledByType" "CoroActorType",
ADD COLUMN "cancelledById" TEXT,
ADD COLUMN "endedByType" "CoroActorType",
ADD COLUMN "endedById" TEXT,
ADD COLUMN "deliveryModeSnapshot" "PopulationDeliveryMode";

ALTER TABLE "PopulationAlertDelivery"
ADD COLUMN "suppressionReason" "PopulationDeliverySuppressionReason";
