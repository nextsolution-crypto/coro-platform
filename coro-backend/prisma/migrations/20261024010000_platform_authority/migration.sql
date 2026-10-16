CREATE TYPE "PlatformAuthorityStatus" AS ENUM ('DRAFT', 'ACTIVE');
CREATE TYPE "PlatformPermission" AS ENUM ('COMMERCIAL_CATALOG_MANAGE','COMMERCIAL_CONFIGURATION_MANAGE','COMMERCIAL_CONTENT_MANAGE','COMMERCIAL_LEGAL_ISSUER_MANAGE','COMMERCIAL_WORKSPACE_MANAGE','COMMERCIAL_PROPOSAL_PREPARE','COMMERCIAL_PROPOSAL_ISSUE','COMMERCIAL_CONTRACT_PREPARE','COMMERCIAL_CONTRACT_ACTIVATE','COMMERCIAL_ENTITLEMENT_PROVISION','ORGANIZATION_360_READ','FINANCIAL_RENDEMENT_READ','FINANCIAL_SALE_VALIDATE','FINANCIAL_ADVISOR_COST_MANAGE');
CREATE TYPE "PlatformPermissionScope" AS ENUM ('ORGANIZATION', 'GLOBAL');
CREATE TYPE "PlatformPermissionGrantStatus" AS ENUM ('ACTIVE', 'REVOKED');

CREATE TABLE "PlatformAuthorityConfiguration" (
  "id" TEXT NOT NULL DEFAULT 'PRIMARY', "operatorOrganizationId" TEXT NOT NULL,
  "founderUserId" TEXT NOT NULL, "status" "PlatformAuthorityStatus" NOT NULL DEFAULT 'DRAFT',
  "lockVersion" INTEGER NOT NULL DEFAULT 0, "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "activatedByUserId" TEXT,
  "activatedAt" TIMESTAMP(3), "activationReason" TEXT, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlatformAuthorityConfiguration_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlatformAuthorityConfiguration_singleton_check" CHECK ("id" = 'PRIMARY'),
  CONSTRAINT "PlatformAuthorityConfiguration_lock_check" CHECK ("lockVersion" >= 0),
  CONSTRAINT "PlatformAuthorityConfiguration_lifecycle_check" CHECK (("status" = 'DRAFT' AND "activatedByUserId" IS NULL AND "activatedAt" IS NULL AND "activationReason" IS NULL) OR ("status" = 'ACTIVE' AND "activatedByUserId" IS NOT NULL AND "activatedAt" IS NOT NULL AND LENGTH(BTRIM("activationReason")) > 0))
);
CREATE UNIQUE INDEX "PlatformAuthorityConfiguration_operatorOrganizationId_key" ON "PlatformAuthorityConfiguration"("operatorOrganizationId");
CREATE UNIQUE INDEX "PlatformAuthorityConfiguration_founderUserId_key" ON "PlatformAuthorityConfiguration"("founderUserId");

CREATE TABLE "PlatformPermissionGrant" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "permission" "PlatformPermission" NOT NULL,
  "scope" "PlatformPermissionScope" NOT NULL, "targetOrganizationId" TEXT,
  "status" "PlatformPermissionGrantStatus" NOT NULL DEFAULT 'ACTIVE',
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "grantedByUserId" TEXT NOT NULL,
  "grantReason" TEXT NOT NULL, "revokedAt" TIMESTAMP(3), "revokedByUserId" TEXT,
  "revocationReason" TEXT, "lockVersion" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlatformPermissionGrant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlatformPermissionGrant_scope_check" CHECK (("scope" = 'GLOBAL' AND "targetOrganizationId" IS NULL) OR ("scope" = 'ORGANIZATION' AND "targetOrganizationId" IS NOT NULL)),
  CONSTRAINT "PlatformPermissionGrant_reason_check" CHECK (LENGTH(BTRIM("grantReason")) > 0),
  CONSTRAINT "PlatformPermissionGrant_lock_check" CHECK ("lockVersion" >= 0),
  CONSTRAINT "PlatformPermissionGrant_lifecycle_check" CHECK (("status" = 'ACTIVE' AND "revokedAt" IS NULL AND "revokedByUserId" IS NULL AND "revocationReason" IS NULL) OR ("status" = 'REVOKED' AND "revokedAt" IS NOT NULL AND "revokedByUserId" IS NOT NULL AND LENGTH(BTRIM("revocationReason")) > 0))
);
CREATE INDEX "PlatformPermissionGrant_userId_permission_status_idx" ON "PlatformPermissionGrant"("userId", "permission", "status");
CREATE INDEX "PlatformPermissionGrant_targetOrganizationId_permission_status_idx" ON "PlatformPermissionGrant"("targetOrganizationId", "permission", "status");
CREATE UNIQUE INDEX "PlatformPermissionGrant_active_global_key" ON "PlatformPermissionGrant"("userId", "permission") WHERE "status" = 'ACTIVE' AND "scope" = 'GLOBAL';
CREATE UNIQUE INDEX "PlatformPermissionGrant_active_organization_key" ON "PlatformPermissionGrant"("userId", "permission", "targetOrganizationId") WHERE "status" = 'ACTIVE' AND "scope" = 'ORGANIZATION';

ALTER TABLE "PlatformAuthorityConfiguration" ADD CONSTRAINT "PlatformAuthorityConfiguration_operatorOrganizationId_fkey" FOREIGN KEY ("operatorOrganizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlatformAuthorityConfiguration" ADD CONSTRAINT "PlatformAuthorityConfiguration_founderUserId_fkey" FOREIGN KEY ("founderUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlatformAuthorityConfiguration" ADD CONSTRAINT "PlatformAuthorityConfiguration_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlatformAuthorityConfiguration" ADD CONSTRAINT "PlatformAuthorityConfiguration_activatedByUserId_fkey" FOREIGN KEY ("activatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlatformPermissionGrant" ADD CONSTRAINT "PlatformPermissionGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlatformPermissionGrant" ADD CONSTRAINT "PlatformPermissionGrant_targetOrganizationId_fkey" FOREIGN KEY ("targetOrganizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlatformPermissionGrant" ADD CONSTRAINT "PlatformPermissionGrant_grantedByUserId_fkey" FOREIGN KEY ("grantedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlatformPermissionGrant" ADD CONSTRAINT "PlatformPermissionGrant_revokedByUserId_fkey" FOREIGN KEY ("revokedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "protect_platform_authority"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Platform authority cannot be deleted' USING ERRCODE = '23514'; END IF;
  IF OLD."status" = 'ACTIVE' THEN RAISE EXCEPTION 'Active platform authority is immutable' USING ERRCODE = '23514'; END IF;
  IF NEW."status" = 'ACTIVE' AND (NEW."operatorOrganizationId" <> OLD."operatorOrganizationId" OR NEW."founderUserId" <> OLD."founderUserId" OR NEW."createdByUserId" <> OLD."createdByUserId" OR NEW."lockVersion" <> OLD."lockVersion" + 1) THEN RAISE EXCEPTION 'Invalid platform authority activation' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "PlatformAuthorityConfiguration_protect" BEFORE UPDATE OR DELETE ON "PlatformAuthorityConfiguration" FOR EACH ROW EXECUTE FUNCTION "protect_platform_authority"();

CREATE OR REPLACE FUNCTION "protect_platform_permission_grant"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Platform permission grants cannot be deleted' USING ERRCODE = '23514'; END IF;
  IF OLD."status" = 'REVOKED' THEN RAISE EXCEPTION 'Revoked platform permission grant is immutable' USING ERRCODE = '23514'; END IF;
  IF NEW."status" = 'REVOKED' AND (NEW."userId" <> OLD."userId" OR NEW."permission" <> OLD."permission" OR NEW."scope" <> OLD."scope" OR NEW."targetOrganizationId" IS DISTINCT FROM OLD."targetOrganizationId" OR NEW."effectiveFrom" <> OLD."effectiveFrom" OR NEW."grantedByUserId" <> OLD."grantedByUserId" OR NEW."grantReason" <> OLD."grantReason" OR NEW."lockVersion" <> OLD."lockVersion" + 1) THEN RAISE EXCEPTION 'Invalid platform permission revocation' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "PlatformPermissionGrant_protect" BEFORE UPDATE OR DELETE ON "PlatformPermissionGrant" FOR EACH ROW EXECUTE FUNCTION "protect_platform_permission_grant"();
