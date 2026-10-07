CREATE TABLE "CommercialSimulationScenarioFamily" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "familyCode" VARCHAR(100) NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommercialSimulationScenarioFamily_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommercialSimulationScenarioFamily_scenarioId_familyCode_key"
ON "CommercialSimulationScenarioFamily"("scenarioId", "familyCode");

CREATE INDEX "CommercialSimulationScenarioFamily_scenarioId_displayOrder_idx"
ON "CommercialSimulationScenarioFamily"("scenarioId", "displayOrder");

ALTER TABLE "CommercialSimulationScenarioFamily"
ADD CONSTRAINT "CommercialSimulationScenarioFamily_scenarioId_fkey"
FOREIGN KEY ("scenarioId") REFERENCES "CommercialSimulationScenario"("id")
ON DELETE RESTRICT ON UPDATE RESTRICT;
