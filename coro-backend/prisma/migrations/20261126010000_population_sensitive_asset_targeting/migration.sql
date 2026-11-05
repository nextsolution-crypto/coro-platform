-- Sentinelle Population: immutable, explicitly selected institutional targets.
-- No existing alert, delivery or surrounding asset is modified retroactively.

CREATE TABLE "PopulationAlertInstitutionTarget" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "surroundingAssetId" TEXT,
    "surroundingAssetContactId" TEXT,
    "assetNameSnapshot" TEXT NOT NULL,
    "assetTypeSnapshot" "RueSurroundingAssetType" NOT NULL,
    "sourceSnapshot" "RueDataSource" NOT NULL,
    "sourceReferenceSnapshot" TEXT,
    "assetValidatedAtSnapshot" TIMESTAMP(3) NOT NULL,
    "contactRoleSnapshot" TEXT,
    "phoneSnapshot" TEXT,
    "emailSnapshot" TEXT,
    "selectedByType" "CoroActorType" NOT NULL,
    "selectedById" TEXT NOT NULL,
    "selectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PopulationAlertInstitutionTarget_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PopulationAlertDelivery"
  ADD COLUMN "institutionTargetId" TEXT;

CREATE UNIQUE INDEX "PopulationAlertInstitutionTarget_alertId_surroundingAssetContactId_key"
  ON "PopulationAlertInstitutionTarget"("alertId", "surroundingAssetContactId");
CREATE INDEX "PopulationAlertInstitutionTarget_alertId_idx"
  ON "PopulationAlertInstitutionTarget"("alertId");
CREATE INDEX "PopulationAlertInstitutionTarget_surroundingAssetId_idx"
  ON "PopulationAlertInstitutionTarget"("surroundingAssetId");
CREATE INDEX "PopulationAlertInstitutionTarget_surroundingAssetContactId_idx"
  ON "PopulationAlertInstitutionTarget"("surroundingAssetContactId");
CREATE INDEX "PopulationAlertDelivery_institutionTargetId_idx"
  ON "PopulationAlertDelivery"("institutionTargetId");

ALTER TABLE "PopulationAlertInstitutionTarget"
  ADD CONSTRAINT "PopulationAlertInstitutionTarget_alertId_fkey"
  FOREIGN KEY ("alertId") REFERENCES "PopulationAlert"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PopulationAlertInstitutionTarget"
  ADD CONSTRAINT "PopulationAlertInstitutionTarget_surroundingAssetId_fkey"
  FOREIGN KEY ("surroundingAssetId") REFERENCES "RueSurroundingAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PopulationAlertInstitutionTarget"
  ADD CONSTRAINT "PopulationAlertInstitutionTarget_surroundingAssetContactId_fkey"
  FOREIGN KEY ("surroundingAssetContactId") REFERENCES "RueSurroundingAssetContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PopulationAlertDelivery"
  ADD CONSTRAINT "PopulationAlertDelivery_institutionTargetId_fkey"
  FOREIGN KEY ("institutionTargetId") REFERENCES "PopulationAlertInstitutionTarget"("id") ON DELETE SET NULL ON UPDATE CASCADE;
