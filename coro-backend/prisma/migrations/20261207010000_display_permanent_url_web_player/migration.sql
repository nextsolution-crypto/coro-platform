CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE "DisplayLocation"
  ADD COLUMN "publicDisplayId" VARCHAR(24),
  ADD COLUMN "publicIdRotatedAt" TIMESTAMP(3);

UPDATE "DisplayLocation"
SET "publicDisplayId" = upper(encode(gen_random_bytes(9), 'hex'))
WHERE "publicDisplayId" IS NULL;

CREATE UNIQUE INDEX "DisplayLocation_publicDisplayId_key"
  ON "DisplayLocation"("publicDisplayId");

CREATE TABLE "DisplayWebActivation" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "buildingId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "codeHash" CHAR(64) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "failedAttempts" INTEGER NOT NULL DEFAULT 0,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DisplayWebActivation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DisplayWebActivation_location_fkey" FOREIGN KEY ("locationId", "organizationId", "buildingId")
    REFERENCES "DisplayLocation"("id", "organizationId", "buildingId") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "DisplayWebActivation_codeHash_key" ON "DisplayWebActivation"("codeHash");
CREATE INDEX "DisplayWebActivation_scope_expiry_idx"
  ON "DisplayWebActivation"("organizationId", "buildingId", "locationId", "expiresAt");

CREATE TABLE "DisplayWebSession" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "buildingId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL,
  "tokenHash" CHAR(64) NOT NULL,
  "keyId" VARCHAR(128) NOT NULL,
  "publicKeyJwk" JSONB NOT NULL,
  "capability" TEXT NOT NULL DEFAULT 'WEB_VIEW_ONLY',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "lastSeenAt" TIMESTAMP(3),
  "lastConfirmedAt" TIMESTAMP(3),
  "lastPublicationId" TEXT,
  "lastVersion" INTEGER,
  "revokedAt" TIMESTAMP(3),
  "revocationReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DisplayWebSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DisplayWebSession_location_fkey" FOREIGN KEY ("locationId", "organizationId", "buildingId")
    REFERENCES "DisplayLocation"("id", "organizationId", "buildingId") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "DisplayWebSession_tokenHash_key" ON "DisplayWebSession"("tokenHash");
CREATE UNIQUE INDEX "DisplayWebSession_deviceId_organizationId_key"
  ON "DisplayWebSession"("deviceId", "organizationId");
CREATE INDEX "DisplayWebSession_scope_status_idx"
  ON "DisplayWebSession"("organizationId", "buildingId", "locationId", "status");
