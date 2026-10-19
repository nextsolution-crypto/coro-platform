CREATE TYPE "CustomerNetworkAuthorityStatus" AS ENUM ('DRAFT', 'ACTIVE', 'REVOKED');
CREATE TYPE "CustomerPortfolioAssignmentSubjectType" AS ENUM ('INTERNAL_USER', 'CLIENT_USER');
CREATE TYPE "CustomerPortfolioAssignmentScope" AS ENUM ('PORTFOLIO', 'REGION', 'BUILDING');
CREATE TYPE "CustomerNetworkPermission" AS ENUM ('NETWORK_SUPERVISION_READ', 'NETWORK_HIERARCHY_MANAGE', 'NETWORK_ASSIGNMENT_MANAGE');
CREATE TYPE "CustomerPortfolioAssignmentStatus" AS ENUM ('ACTIVE', 'REVOKED');

CREATE TABLE "CustomerNetworkAuthorityConfiguration" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "initialResponsibleUserId" TEXT NOT NULL,
  "responsibleUserId" TEXT NOT NULL,
  "status" "CustomerNetworkAuthorityStatus" NOT NULL DEFAULT 'DRAFT',
  "mandateReference" TEXT NOT NULL,
  "creationReason" TEXT NOT NULL,
  "lockVersion" INTEGER NOT NULL DEFAULT 0,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "activatedByUserId" TEXT,
  "activatedAt" TIMESTAMP(3),
  "activationReason" TEXT,
  "revokedByUserId" TEXT,
  "revokedAt" TIMESTAMP(3),
  "revocationReason" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomerNetworkAuthorityConfiguration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerPortfolio" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lockVersion" INTEGER NOT NULL DEFAULT 0,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomerPortfolio_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerPortfolioRegion" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lockVersion" INTEGER NOT NULL DEFAULT 0,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomerPortfolioRegion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerPortfolioRegionLink" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "portfolioId" TEXT NOT NULL,
  "regionId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerPortfolioRegionLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerPortfolioBuildingMembership" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "portfolioId" TEXT NOT NULL,
  "regionId" TEXT NOT NULL,
  "buildingId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerPortfolioBuildingMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerPortfolioAssignment" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "subjectType" "CustomerPortfolioAssignmentSubjectType" NOT NULL,
  "userId" TEXT,
  "clientUserId" TEXT,
  "scope" "CustomerPortfolioAssignmentScope" NOT NULL,
  "portfolioId" TEXT,
  "regionId" TEXT,
  "buildingId" TEXT,
  "permissions" "CustomerNetworkPermission"[] NOT NULL DEFAULT ARRAY[]::"CustomerNetworkPermission"[],
  "status" "CustomerPortfolioAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveUntil" TIMESTAMP(3),
  "grantedByUserId" TEXT NOT NULL,
  "grantReason" TEXT NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "revokedByUserId" TEXT,
  "revocationReason" TEXT,
  "lockVersion" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomerPortfolioAssignment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CustomerPortfolioAssignment_subject_check" CHECK (
    ("subjectType" = 'INTERNAL_USER' AND "userId" IS NOT NULL AND "clientUserId" IS NULL) OR
    ("subjectType" = 'CLIENT_USER' AND "clientUserId" IS NOT NULL AND "userId" IS NULL)
  ),
  CONSTRAINT "CustomerPortfolioAssignment_scope_check" CHECK (
    ("scope" = 'PORTFOLIO' AND "portfolioId" IS NOT NULL AND "regionId" IS NULL AND "buildingId" IS NULL) OR
    ("scope" = 'REGION' AND "portfolioId" IS NULL AND "regionId" IS NOT NULL AND "buildingId" IS NULL) OR
    ("scope" = 'BUILDING' AND "portfolioId" IS NULL AND "regionId" IS NULL AND "buildingId" IS NOT NULL)
  ),
  CONSTRAINT "CustomerPortfolioAssignment_effective_check" CHECK ("effectiveUntil" IS NULL OR "effectiveUntil" > "effectiveFrom"),
  CONSTRAINT "CustomerPortfolioAssignment_permissions_check" CHECK (cardinality("permissions") > 0)
);

CREATE UNIQUE INDEX "CustomerNetworkAuthorityConfiguration_organizationId_key" ON "CustomerNetworkAuthorityConfiguration"("organizationId");
CREATE INDEX "CustomerNetworkAuthorityConfiguration_organizationId_status_idx" ON "CustomerNetworkAuthorityConfiguration"("organizationId", "status");
CREATE INDEX "CustomerNetworkAuthorityConfiguration_responsibleUserId_status_idx" ON "CustomerNetworkAuthorityConfiguration"("responsibleUserId", "status");
CREATE UNIQUE INDEX "CustomerPortfolio_organizationId_code_key" ON "CustomerPortfolio"("organizationId", "code");
CREATE UNIQUE INDEX "CustomerPortfolio_id_organizationId_key" ON "CustomerPortfolio"("id", "organizationId");
CREATE INDEX "CustomerPortfolio_organizationId_isActive_name_idx" ON "CustomerPortfolio"("organizationId", "isActive", "name");
CREATE UNIQUE INDEX "CustomerPortfolioRegion_organizationId_code_key" ON "CustomerPortfolioRegion"("organizationId", "code");
CREATE UNIQUE INDEX "CustomerPortfolioRegion_id_organizationId_key" ON "CustomerPortfolioRegion"("id", "organizationId");
CREATE INDEX "CustomerPortfolioRegion_organizationId_isActive_name_idx" ON "CustomerPortfolioRegion"("organizationId", "isActive", "name");
CREATE UNIQUE INDEX "CustomerPortfolioRegionLink_portfolioId_regionId_key" ON "CustomerPortfolioRegionLink"("portfolioId", "regionId");
CREATE INDEX "CustomerPortfolioRegionLink_organizationId_portfolioId_idx" ON "CustomerPortfolioRegionLink"("organizationId", "portfolioId");
CREATE INDEX "CustomerPortfolioRegionLink_organizationId_regionId_idx" ON "CustomerPortfolioRegionLink"("organizationId", "regionId");
CREATE UNIQUE INDEX "CustomerPortfolioBuildingMembership_portfolioId_buildingId_key" ON "CustomerPortfolioBuildingMembership"("portfolioId", "buildingId");
CREATE INDEX "CustomerPortfolioBuildingMembership_organizationId_portfolioId_regionId_idx" ON "CustomerPortfolioBuildingMembership"("organizationId", "portfolioId", "regionId");
CREATE INDEX "CustomerPortfolioBuildingMembership_organizationId_buildingId_idx" ON "CustomerPortfolioBuildingMembership"("organizationId", "buildingId");
CREATE INDEX "CustomerPortfolioAssignment_organizationId_status_effectiveFrom_effectiveUntil_idx" ON "CustomerPortfolioAssignment"("organizationId", "status", "effectiveFrom", "effectiveUntil");
CREATE INDEX "CustomerPortfolioAssignment_userId_status_idx" ON "CustomerPortfolioAssignment"("userId", "status");
CREATE INDEX "CustomerPortfolioAssignment_clientUserId_status_idx" ON "CustomerPortfolioAssignment"("clientUserId", "status");
CREATE INDEX "CustomerPortfolioAssignment_portfolioId_status_idx" ON "CustomerPortfolioAssignment"("portfolioId", "status");
CREATE INDEX "CustomerPortfolioAssignment_regionId_status_idx" ON "CustomerPortfolioAssignment"("regionId", "status");
CREATE INDEX "CustomerPortfolioAssignment_buildingId_status_idx" ON "CustomerPortfolioAssignment"("buildingId", "status");
CREATE UNIQUE INDEX "Building_id_organizationId_key" ON "Building"("id", "organizationId");
CREATE UNIQUE INDEX "User_id_organizationId_key" ON "User"("id", "organizationId");
CREATE UNIQUE INDEX "ClientUser_id_organizationId_key" ON "ClientUser"("id", "organizationId");

ALTER TABLE "CustomerNetworkAuthorityConfiguration" ADD CONSTRAINT "CustomerNetworkAuthorityConfiguration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerNetworkAuthorityConfiguration" ADD CONSTRAINT "CustomerNetworkAuthorityConfiguration_initialResponsibleUserId_fkey" FOREIGN KEY ("initialResponsibleUserId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerNetworkAuthorityConfiguration" ADD CONSTRAINT "CustomerNetworkAuthorityConfiguration_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerNetworkAuthorityConfiguration" ADD CONSTRAINT "CustomerNetworkAuthorityConfiguration_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerNetworkAuthorityConfiguration" ADD CONSTRAINT "CustomerNetworkAuthorityConfiguration_activatedByUserId_fkey" FOREIGN KEY ("activatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerNetworkAuthorityConfiguration" ADD CONSTRAINT "CustomerNetworkAuthorityConfiguration_revokedByUserId_fkey" FOREIGN KEY ("revokedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CustomerPortfolio" ADD CONSTRAINT "CustomerPortfolio_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerPortfolio" ADD CONSTRAINT "CustomerPortfolio_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerPortfolioRegion" ADD CONSTRAINT "CustomerPortfolioRegion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerPortfolioRegion" ADD CONSTRAINT "CustomerPortfolioRegion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerPortfolioRegionLink" ADD CONSTRAINT "CustomerPortfolioRegionLink_portfolio_fkey" FOREIGN KEY ("portfolioId", "organizationId") REFERENCES "CustomerPortfolio"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerPortfolioRegionLink" ADD CONSTRAINT "CustomerPortfolioRegionLink_region_fkey" FOREIGN KEY ("regionId", "organizationId") REFERENCES "CustomerPortfolioRegion"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerPortfolioRegionLink" ADD CONSTRAINT "CustomerPortfolioRegionLink_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerPortfolioBuildingMembership" ADD CONSTRAINT "CustomerPortfolioBuildingMembership_portfolio_fkey" FOREIGN KEY ("portfolioId", "organizationId") REFERENCES "CustomerPortfolio"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerPortfolioBuildingMembership" ADD CONSTRAINT "CustomerPortfolioBuildingMembership_region_fkey" FOREIGN KEY ("regionId", "organizationId") REFERENCES "CustomerPortfolioRegion"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerPortfolioBuildingMembership" ADD CONSTRAINT "CustomerPortfolioBuildingMembership_region_link_fkey" FOREIGN KEY ("portfolioId", "regionId") REFERENCES "CustomerPortfolioRegionLink"("portfolioId", "regionId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerPortfolioBuildingMembership" ADD CONSTRAINT "CustomerPortfolioBuildingMembership_building_fkey" FOREIGN KEY ("buildingId", "organizationId") REFERENCES "Building"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerPortfolioBuildingMembership" ADD CONSTRAINT "CustomerPortfolioBuildingMembership_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CustomerPortfolioAssignment" ADD CONSTRAINT "CustomerPortfolioAssignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerPortfolioAssignment" ADD CONSTRAINT "CustomerPortfolioAssignment_userId_fkey" FOREIGN KEY ("userId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerPortfolioAssignment" ADD CONSTRAINT "CustomerPortfolioAssignment_clientUserId_fkey" FOREIGN KEY ("clientUserId", "organizationId") REFERENCES "ClientUser"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerPortfolioAssignment" ADD CONSTRAINT "CustomerPortfolioAssignment_portfolioId_fkey" FOREIGN KEY ("portfolioId", "organizationId") REFERENCES "CustomerPortfolio"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerPortfolioAssignment" ADD CONSTRAINT "CustomerPortfolioAssignment_regionId_fkey" FOREIGN KEY ("regionId", "organizationId") REFERENCES "CustomerPortfolioRegion"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerPortfolioAssignment" ADD CONSTRAINT "CustomerPortfolioAssignment_buildingId_fkey" FOREIGN KEY ("buildingId", "organizationId") REFERENCES "Building"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerPortfolioAssignment" ADD CONSTRAINT "CustomerPortfolioAssignment_grantedByUserId_fkey" FOREIGN KEY ("grantedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerPortfolioAssignment" ADD CONSTRAINT "CustomerPortfolioAssignment_revokedByUserId_fkey" FOREIGN KEY ("revokedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
