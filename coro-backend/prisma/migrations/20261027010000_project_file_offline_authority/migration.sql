-- P-2.2: additive browser-restricted offline document authority.
CREATE TYPE "OfflineDocumentClassification" AS ENUM ('PROHIBITED', 'NON_SENSITIVE_EMERGENCY');
CREATE TYPE "OfflineDocumentLeaseStatus" AS ENUM ('ACTIVE', 'RECONCILED', 'REVOKED', 'EXPIRED');

ALTER TABLE "ProjectFile"
  ADD COLUMN "offlineClassification" "OfflineDocumentClassification" NOT NULL DEFAULT 'PROHIBITED',
  ADD COLUMN "offlineApprovedAt" TIMESTAMP(3),
  ADD COLUMN "offlineApprovedById" TEXT,
  ADD COLUMN "offlineApprovalReason" TEXT;

CREATE TABLE "OfflineDocumentDevice" (
  "id" TEXT NOT NULL,
  "clientUserId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "credentialIdHash" TEXT NOT NULL,
    "credentialPublicKey" BYTEA NOT NULL,
    "credentialCounter" INTEGER NOT NULL DEFAULT 0,
    "credentialTransports" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "webauthnVerifiedAt" TIMESTAMP(3) NOT NULL,
  "prfSupported" BOOLEAN NOT NULL,
  "label" TEXT NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastReconciledAt" TIMESTAMP(3),
  CONSTRAINT "OfflineDocumentDevice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OfflineDocumentLease" (
  "id" TEXT NOT NULL,
  "leaseId" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL,
  "clientUserId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "buildingId" TEXT NOT NULL,
  "projectFileId" TEXT NOT NULL,
  "projectFileVersion" INTEGER NOT NULL,
  "documentSha256" TEXT NOT NULL,
  "credentialIdHash" TEXT NOT NULL,
  "issuedAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "status" "OfflineDocumentLeaseStatus" NOT NULL DEFAULT 'ACTIVE',
  "reconciledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OfflineDocumentLease_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OfflineDocumentAuditEvent" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL,
  "clientUserId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "leaseId" TEXT,
  "eventType" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,
  CONSTRAINT "OfflineDocumentAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OfflineDocumentDevice_credentialIdHash_key" ON "OfflineDocumentDevice"("credentialIdHash");
CREATE INDEX "OfflineDocumentDevice_clientUserId_organizationId_revokedAt_idx" ON "OfflineDocumentDevice"("clientUserId", "organizationId", "revokedAt");
CREATE UNIQUE INDEX "OfflineDocumentLease_leaseId_key" ON "OfflineDocumentLease"("leaseId");
CREATE INDEX "OfflineDocumentLease_clientUserId_organizationId_status_idx" ON "OfflineDocumentLease"("clientUserId", "organizationId", "status");
CREATE INDEX "OfflineDocumentLease_projectFileId_status_idx" ON "OfflineDocumentLease"("projectFileId", "status");
CREATE INDEX "OfflineDocumentLease_expiresAt_idx" ON "OfflineDocumentLease"("expiresAt");
CREATE UNIQUE INDEX "OfflineDocumentAuditEvent_deviceId_requestId_key" ON "OfflineDocumentAuditEvent"("deviceId", "requestId");
CREATE INDEX "OfflineDocumentAuditEvent_clientUserId_organizationId_occurredAt_idx" ON "OfflineDocumentAuditEvent"("clientUserId", "organizationId", "occurredAt");

ALTER TABLE "OfflineDocumentDevice" ADD CONSTRAINT "OfflineDocumentDevice_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "ClientUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OfflineDocumentLease" ADD CONSTRAINT "OfflineDocumentLease_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "OfflineDocumentDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OfflineDocumentLease" ADD CONSTRAINT "OfflineDocumentLease_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "ClientUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OfflineDocumentLease" ADD CONSTRAINT "OfflineDocumentLease_projectFileId_fkey" FOREIGN KEY ("projectFileId") REFERENCES "ProjectFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OfflineDocumentAuditEvent" ADD CONSTRAINT "OfflineDocumentAuditEvent_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "OfflineDocumentDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OfflineDocumentAuditEvent" ADD CONSTRAINT "OfflineDocumentAuditEvent_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "ClientUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
