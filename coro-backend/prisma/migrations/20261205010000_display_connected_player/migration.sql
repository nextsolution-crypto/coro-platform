CREATE TYPE "DisplayDeviceStatus" AS ENUM ('REGISTERED', 'PENDING_ENROLLMENT', 'ACTIVE', 'SUSPENDED', 'REVOKED', 'RETIRED');
CREATE TYPE "DisplayDeviceAssignmentStatus" AS ENUM ('ACTIVE', 'REVOKED');

CREATE TABLE "DisplayDevice" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "buildingId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "profile" TEXT NOT NULL,
  "status" "DisplayDeviceStatus" NOT NULL DEFAULT 'PENDING_ENROLLMENT',
  "publicKey" TEXT NOT NULL,
  "keyId" TEXT NOT NULL,
  "softwareVersion" TEXT,
  "lastVerifiedSyncAt" TIMESTAMP(3),
  "lastCommunicationAt" TIMESTAMP(3),
  "lastAcceptedManifestSequence" BIGINT NOT NULL DEFAULT 0,
  "lastDeclaredPublicationId" TEXT,
  "lastDeclaredVersion" INTEGER,
  "revokedAt" TIMESTAMP(3),
  "revocationReason" TEXT,
  "lockVersion" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DisplayDevice_org_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT,
  CONSTRAINT "DisplayDevice_building_scope_fkey" FOREIGN KEY ("buildingId", "organizationId") REFERENCES "Building"("id", "organizationId") ON DELETE RESTRICT,
  CONSTRAINT "DisplayDevice_location_fkey" FOREIGN KEY ("locationId") REFERENCES "DisplayLocation"("id") ON DELETE RESTRICT,
  CONSTRAINT "DisplayDevice_revocation_consistency" CHECK (("status" = 'REVOKED' AND "revokedAt" IS NOT NULL) OR ("status" <> 'REVOKED'))
);
CREATE UNIQUE INDEX "DisplayDevice_org_key_key" ON "DisplayDevice"("organizationId", "keyId");
CREATE UNIQUE INDEX "DisplayDevice_scope_key" ON "DisplayDevice"("id", "organizationId", "buildingId");
CREATE INDEX "DisplayDevice_scope_status_idx" ON "DisplayDevice"("organizationId", "buildingId", "locationId", "status");

CREATE TABLE "DisplayDeviceEnrollmentInvitation" (
  "id" TEXT PRIMARY KEY,
  "deviceId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "buildingId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "tokenHash" CHAR(64) NOT NULL,
  "expectedKeyId" TEXT NOT NULL,
  "expectedPublicKey" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "consumedRequestId" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DisplayDeviceInvitation_device_scope_fkey" FOREIGN KEY ("deviceId", "organizationId", "buildingId") REFERENCES "DisplayDevice"("id", "organizationId", "buildingId") ON DELETE RESTRICT,
  CONSTRAINT "DisplayDeviceInvitation_location_fkey" FOREIGN KEY ("locationId") REFERENCES "DisplayLocation"("id") ON DELETE RESTRICT,
  CONSTRAINT "DisplayDeviceInvitation_creator_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "DisplayDeviceInvitation_token_key" ON "DisplayDeviceEnrollmentInvitation"("tokenHash");
CREATE UNIQUE INDEX "DisplayDeviceInvitation_request_key" ON "DisplayDeviceEnrollmentInvitation"("consumedRequestId");
CREATE INDEX "DisplayDeviceInvitation_expiry_idx" ON "DisplayDeviceEnrollmentInvitation"("deviceId", "organizationId", "expiresAt");

CREATE TABLE "DisplayDeviceNonce" (
  "id" TEXT PRIMARY KEY,
  "deviceId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "nonceHash" CHAR(64) NOT NULL,
  "operation" TEXT NOT NULL,
  "httpMethod" TEXT NOT NULL,
  "requestPath" TEXT NOT NULL,
  "bodySha256" CHAR(64) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DisplayDeviceNonce_device_fkey" FOREIGN KEY ("deviceId") REFERENCES "DisplayDevice"("id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "DisplayDeviceNonce_hash_key" ON "DisplayDeviceNonce"("nonceHash");
CREATE INDEX "DisplayDeviceNonce_consume_idx" ON "DisplayDeviceNonce"("deviceId", "organizationId", "expiresAt", "consumedAt");

CREATE TABLE "DisplayDeviceAssignment" (
  "id" TEXT PRIMARY KEY,
  "deviceId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "buildingId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "publicationId" TEXT NOT NULL,
  "profile" TEXT NOT NULL,
  "status" "DisplayDeviceAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "assignedById" TEXT NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "revocationReason" TEXT,
  "lockVersion" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "DisplayDeviceAssignment_device_scope_fkey" FOREIGN KEY ("deviceId", "organizationId", "buildingId") REFERENCES "DisplayDevice"("id", "organizationId", "buildingId") ON DELETE RESTRICT,
  CONSTRAINT "DisplayDeviceAssignment_publication_scope_fkey" FOREIGN KEY ("publicationId", "organizationId", "buildingId") REFERENCES "DisplayPlanPublication"("id", "organizationId", "buildingId") ON DELETE RESTRICT,
  CONSTRAINT "DisplayDeviceAssignment_actor_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT,
  CONSTRAINT "DisplayDeviceAssignment_revocation_consistency" CHECK (("status" = 'REVOKED' AND "revokedAt" IS NOT NULL) OR "status" = 'ACTIVE')
);
CREATE UNIQUE INDEX "DisplayDeviceAssignment_device_publication_key" ON "DisplayDeviceAssignment"("deviceId", "publicationId");
CREATE INDEX "DisplayDeviceAssignment_scope_idx" ON "DisplayDeviceAssignment"("organizationId", "buildingId", "locationId", "status");
CREATE INDEX "DisplayDeviceAssignment_publication_idx" ON "DisplayDeviceAssignment"("publicationId", "status");

CREATE TABLE "DisplayDeviceManifestSequence" (
  "deviceId" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "nextSequence" BIGINT NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DisplayDeviceManifestSequence_device_fkey" FOREIGN KEY ("deviceId") REFERENCES "DisplayDevice"("id") ON DELETE RESTRICT
);
CREATE INDEX "DisplayDeviceManifestSequence_org_idx" ON "DisplayDeviceManifestSequence"("organizationId");

CREATE TABLE "DisplayDeviceSync" (
  "id" TEXT PRIMARY KEY,
  "deviceId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "buildingId" TEXT NOT NULL,
  "publicationId" TEXT,
  "manifestSequence" BIGINT,
  "status" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "errorCode" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DisplayDeviceSync_device_scope_fkey" FOREIGN KEY ("deviceId", "organizationId", "buildingId") REFERENCES "DisplayDevice"("id", "organizationId", "buildingId") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "DisplayDeviceSync_request_key" ON "DisplayDeviceSync"("deviceId", "requestId");
CREATE INDEX "DisplayDeviceSync_scope_idx" ON "DisplayDeviceSync"("organizationId", "buildingId", "deviceId", "createdAt");

CREATE TABLE "DisplayDeviceEvent" (
  "id" TEXT PRIMARY KEY,
  "deviceId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "buildingId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "requestId" TEXT,
  "declaredState" JSONB,
  "verifiedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DisplayDeviceEvent_device_scope_fkey" FOREIGN KEY ("deviceId", "organizationId", "buildingId") REFERENCES "DisplayDevice"("id", "organizationId", "buildingId") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "DisplayDeviceEvent_request_key" ON "DisplayDeviceEvent"("deviceId", "requestId");
CREATE INDEX "DisplayDeviceEvent_scope_idx" ON "DisplayDeviceEvent"("organizationId", "buildingId", "deviceId", "createdAt");
CREATE INDEX "DisplayDeviceEvent_type_idx" ON "DisplayDeviceEvent"("eventType", "createdAt");

CREATE FUNCTION "protect_display_device_events"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'DisplayDeviceEvent is append-only'; END $$;
CREATE TRIGGER "DisplayDeviceEvent_append_only_update" BEFORE UPDATE ON "DisplayDeviceEvent" FOR EACH ROW EXECUTE FUNCTION "protect_display_device_events"();
CREATE TRIGGER "DisplayDeviceEvent_append_only_delete" BEFORE DELETE ON "DisplayDeviceEvent" FOR EACH ROW EXECUTE FUNCTION "protect_display_device_events"();
