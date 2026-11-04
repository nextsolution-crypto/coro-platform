CREATE TYPE "DemoEnvironmentStatus" AS ENUM ('ACTIVE', 'PAUSED');
CREATE TYPE "DemoCommunicationMode" AS ENUM ('SIMULATE', 'BLOCK');
CREATE TYPE "DemoFixtureState" AS ENUM ('ACTIVE', 'SUPERSEDED', 'RETIRED');
CREATE TYPE "DemoCommunicationChannel" AS ENUM ('EMAIL', 'SMS', 'PUSH', 'WEBHOOK', 'INVITATION', 'PHYSICAL_INTEGRATION', 'AI_PROVIDER');

CREATE TABLE "DemoEnvironment" (
    "organizationId" TEXT NOT NULL,
    "fixtureNamespace" TEXT NOT NULL,
    "referenceEmailHash" CHAR(64) NOT NULL,
    "status" "DemoEnvironmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "communicationMode" "DemoCommunicationMode" NOT NULL DEFAULT 'SIMULATE',
    "externalProvidersDisabled" BOOLEAN NOT NULL DEFAULT true,
    "lockVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DemoEnvironment_pkey" PRIMARY KEY ("organizationId")
);

CREATE TABLE "DemoFixtureRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fixtureNamespace" TEXT NOT NULL,
    "fixtureKey" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "state" "DemoFixtureState" NOT NULL DEFAULT 'ACTIVE',
    "baseline" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DemoFixtureRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DemoCommunicationEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "channel" "DemoCommunicationChannel" NOT NULL,
    "operation" TEXT NOT NULL,
    "recipientHash" CHAR(64),
    "payloadHash" CHAR(64) NOT NULL,
    "idempotencyKey" TEXT,
    "simulated" BOOLEAN NOT NULL DEFAULT true,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DemoCommunicationEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DemoEnvironment_fixtureNamespace_key" ON "DemoEnvironment"("fixtureNamespace");
CREATE INDEX "DemoEnvironment_status_communicationMode_idx" ON "DemoEnvironment"("status", "communicationMode");
CREATE UNIQUE INDEX "DemoFixtureRecord_organizationId_fixtureNamespace_fixtureKey_key" ON "DemoFixtureRecord"("organizationId", "fixtureNamespace", "fixtureKey");
CREATE UNIQUE INDEX "DemoFixtureRecord_organizationId_entityType_entityId_key" ON "DemoFixtureRecord"("organizationId", "entityType", "entityId");
CREATE INDEX "DemoFixtureRecord_organizationId_fixtureNamespace_state_idx" ON "DemoFixtureRecord"("organizationId", "fixtureNamespace", "state");
CREATE UNIQUE INDEX "DemoCommunicationEvent_organizationId_idempotencyKey_key" ON "DemoCommunicationEvent"("organizationId", "idempotencyKey");
CREATE INDEX "DemoCommunicationEvent_organizationId_channel_createdAt_idx" ON "DemoCommunicationEvent"("organizationId", "channel", "createdAt");

ALTER TABLE "DemoEnvironment" ADD CONSTRAINT "DemoEnvironment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DemoFixtureRecord" ADD CONSTRAINT "DemoFixtureRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DemoCommunicationEvent" ADD CONSTRAINT "DemoCommunicationEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
