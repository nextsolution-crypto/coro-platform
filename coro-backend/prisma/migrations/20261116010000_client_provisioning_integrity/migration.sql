CREATE TYPE "ClientInvitationEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'DELIVERED', 'FAILED', 'EXHAUSTED', 'CANCELLED');

CREATE TABLE "ClientProvisioningRequest" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "payloadHash" CHAR(64) NOT NULL,
  "clientId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientProvisioningRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClientInvitationEvent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "clientUserId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "recipientHash" CHAR(64) NOT NULL,
  "encryptedEnvelope" TEXT NOT NULL,
  "encryptionKeyId" TEXT NOT NULL,
  "status" "ClientInvitationEventStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "leaseExpiresAt" TIMESTAMP(3),
  "providerMessageId" TEXT,
  "deliveredAt" TIMESTAMP(3),
  "lastErrorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClientInvitationEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClientProvisioningRequest_clientId_key" ON "ClientProvisioningRequest"("clientId");
CREATE UNIQUE INDEX "ClientProvisioningRequest_org_actor_key" ON "ClientProvisioningRequest"("organizationId", "actorUserId", "idempotencyKey");
CREATE INDEX "ClientProvisioningRequest_org_actor_created_idx" ON "ClientProvisioningRequest"("organizationId", "actorUserId", "createdAt");
CREATE UNIQUE INDEX "ClientInvitationEvent_idempotencyKey_key" ON "ClientInvitationEvent"("idempotencyKey");
CREATE INDEX "ClientInvitationEvent_status_next_idx" ON "ClientInvitationEvent"("status", "nextAttemptAt");
CREATE INDEX "ClientInvitationEvent_org_client_created_idx" ON "ClientInvitationEvent"("organizationId", "clientId", "createdAt");

ALTER TABLE "ClientProvisioningRequest" ADD CONSTRAINT "ClientProvisioningRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClientInvitationEvent" ADD CONSTRAINT "ClientInvitationEvent_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClientInvitationEvent" ADD CONSTRAINT "ClientInvitationEvent_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "ClientUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
