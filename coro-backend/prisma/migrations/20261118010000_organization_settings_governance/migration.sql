ALTER TABLE "Organization"
  ADD COLUMN "companyName" TEXT,
  ADD COLUMN "companyLogoB64" TEXT,
  ADD COLUMN "companyLogoFullB64" TEXT,
  ADD COLUMN "companyPhone" TEXT,
  ADD COLUMN "companyEmail" TEXT,
  ADD COLUMN "companyAddress" TEXT,
  ADD COLUMN "companyWebsite" TEXT,
  ADD COLUMN "companyTagline" TEXT,
  ADD COLUMN "companyLicense" TEXT;

CREATE TABLE "OrganizationSettingsConflict" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "field" TEXT NOT NULL,
  "values" JSONB NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  "resolvedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrganizationSettingsConflict_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrganizationSettingsConflict_organizationId_field_key"
  ON "OrganizationSettingsConflict"("organizationId", "field");
CREATE INDEX "OrganizationSettingsConflict_organizationId_resolvedAt_idx"
  ON "OrganizationSettingsConflict"("organizationId", "resolvedAt");
ALTER TABLE "OrganizationSettingsConflict"
  ADD CONSTRAINT "OrganizationSettingsConflict_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "OrganizationUserInvitationEvent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
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
  CONSTRAINT "OrganizationUserInvitationEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OrganizationUserInvitationEvent_idempotencyKey_key"
  ON "OrganizationUserInvitationEvent"("idempotencyKey");
CREATE INDEX "OrganizationUserInvitationEvent_status_nextAttemptAt_idx"
  ON "OrganizationUserInvitationEvent"("status", "nextAttemptAt");
CREATE INDEX "OrganizationUserInvitationEvent_organizationId_userId_createdAt_idx"
  ON "OrganizationUserInvitationEvent"("organizationId", "userId", "createdAt");
ALTER TABLE "OrganizationUserInvitationEvent"
  ADD CONSTRAINT "OrganizationUserInvitationEvent_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrganizationUserInvitationEvent"
  ADD CONSTRAINT "OrganizationUserInvitationEvent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Only unanimous historical values become canonical. Divergent values are
-- retained on User and recorded for an explicit administrative resolution.
WITH source AS (
  SELECT "organizationId", 'companyName' AS field, "companyName" AS value FROM "User"
  UNION ALL SELECT "organizationId", 'companyLogoB64', "companyLogoB64" FROM "User"
  UNION ALL SELECT "organizationId", 'companyLogoFullB64', "companyLogoFullB64" FROM "User"
  UNION ALL SELECT "organizationId", 'companyPhone', "companyPhone" FROM "User"
  UNION ALL SELECT "organizationId", 'companyEmail', "companyEmail" FROM "User"
  UNION ALL SELECT "organizationId", 'companyAddress', "companyAddress" FROM "User"
  UNION ALL SELECT "organizationId", 'companyWebsite', "companyWebsite" FROM "User"
  UNION ALL SELECT "organizationId", 'companyTagline', "companyTagline" FROM "User"
  UNION ALL SELECT "organizationId", 'companyLicense', "companyLicense" FROM "User"
), unanimous AS (
  SELECT "organizationId", field, min(value) AS value
  FROM source WHERE value IS NOT NULL AND btrim(value) <> ''
  GROUP BY "organizationId", field HAVING count(DISTINCT value) = 1
)
UPDATE "Organization" o SET
  "companyName" = u_name.value,
  "companyLogoB64" = u_logo.value,
  "companyLogoFullB64" = u_logo_full.value,
  "companyPhone" = u_phone.value,
  "companyEmail" = u_email.value,
  "companyAddress" = u_address.value,
  "companyWebsite" = u_website.value,
  "companyTagline" = u_tagline.value,
  "companyLicense" = u_license.value
FROM (SELECT DISTINCT "organizationId" FROM unanimous) ids
LEFT JOIN unanimous u_name ON u_name."organizationId" = ids."organizationId" AND u_name.field = 'companyName'
LEFT JOIN unanimous u_logo ON u_logo."organizationId" = ids."organizationId" AND u_logo.field = 'companyLogoB64'
LEFT JOIN unanimous u_logo_full ON u_logo_full."organizationId" = ids."organizationId" AND u_logo_full.field = 'companyLogoFullB64'
LEFT JOIN unanimous u_phone ON u_phone."organizationId" = ids."organizationId" AND u_phone.field = 'companyPhone'
LEFT JOIN unanimous u_email ON u_email."organizationId" = ids."organizationId" AND u_email.field = 'companyEmail'
LEFT JOIN unanimous u_address ON u_address."organizationId" = ids."organizationId" AND u_address.field = 'companyAddress'
LEFT JOIN unanimous u_website ON u_website."organizationId" = ids."organizationId" AND u_website.field = 'companyWebsite'
LEFT JOIN unanimous u_tagline ON u_tagline."organizationId" = ids."organizationId" AND u_tagline.field = 'companyTagline'
LEFT JOIN unanimous u_license ON u_license."organizationId" = ids."organizationId" AND u_license.field = 'companyLicense'
WHERE o.id = ids."organizationId";

WITH source AS (
  SELECT "organizationId", 'companyName' AS field, "companyName" AS value FROM "User"
  UNION ALL SELECT "organizationId", 'companyLogoB64', "companyLogoB64" FROM "User"
  UNION ALL SELECT "organizationId", 'companyLogoFullB64', "companyLogoFullB64" FROM "User"
  UNION ALL SELECT "organizationId", 'companyPhone', "companyPhone" FROM "User"
  UNION ALL SELECT "organizationId", 'companyEmail', "companyEmail" FROM "User"
  UNION ALL SELECT "organizationId", 'companyAddress', "companyAddress" FROM "User"
  UNION ALL SELECT "organizationId", 'companyWebsite', "companyWebsite" FROM "User"
  UNION ALL SELECT "organizationId", 'companyTagline', "companyTagline" FROM "User"
  UNION ALL SELECT "organizationId", 'companyLicense', "companyLicense" FROM "User"
)
INSERT INTO "OrganizationSettingsConflict" ("id", "organizationId", "field", "values")
SELECT gen_random_uuid()::text, "organizationId", field, jsonb_agg(DISTINCT value ORDER BY value)
FROM source WHERE value IS NOT NULL AND btrim(value) <> ''
GROUP BY "organizationId", field HAVING count(DISTINCT value) > 1;
