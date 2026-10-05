CREATE TABLE "CommercialConfigurationDeployment" (
  "id" TEXT NOT NULL,
  "definitionCode" TEXT NOT NULL,
  "definitionVersion" TEXT NOT NULL,
  "definitionFingerprint" TEXT NOT NULL,
  "priceBookId" TEXT NOT NULL,
  "priceBookVersionId" TEXT NOT NULL,
  "costAssumptionSetId" TEXT NOT NULL,
  "costAssumptionVersionId" TEXT NOT NULL,
  "configurationFingerprint" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'APPLIED',
  "approvedByUserId" TEXT,
  "approvedAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "lockVersion" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommercialConfigurationDeployment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommercialConfigurationDeployment_priceBookId_fkey" FOREIGN KEY ("priceBookId") REFERENCES "PriceBook"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CommercialConfigurationDeployment_priceBookVersionId_fkey" FOREIGN KEY ("priceBookVersionId") REFERENCES "PriceBookVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CommercialConfigurationDeployment_costAssumptionSetId_fkey" FOREIGN KEY ("costAssumptionSetId") REFERENCES "CommercialCostAssumptionSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CommercialConfigurationDeployment_costAssumptionVersionId_fkey" FOREIGN KEY ("costAssumptionVersionId") REFERENCES "CommercialCostAssumptionVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CommercialConfigurationDeployment_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CommercialConfigurationDeployment_status_check" CHECK ("status" IN ('APPLIED','APPROVED','COST_PUBLISHED','PUBLISHED','PARTIALLY_PUBLISHED'))
);

CREATE UNIQUE INDEX "CommercialConfigDeployment_definition_target_key" ON "CommercialConfigurationDeployment"("definitionCode", "definitionVersion", "priceBookVersionId");
CREATE INDEX "CommercialConfigDeployment_definition_status_idx" ON "CommercialConfigurationDeployment"("definitionCode", "definitionVersion", "status");
CREATE INDEX "CommercialConfigDeployment_priceBook_idx" ON "CommercialConfigurationDeployment"("priceBookId");
CREATE INDEX "CommercialConfigDeployment_cost_version_idx" ON "CommercialConfigurationDeployment"("costAssumptionVersionId");
