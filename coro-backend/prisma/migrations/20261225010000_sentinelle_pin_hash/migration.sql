-- NIP Sentinelle hachés (audit M5-02). Colonne facultative : compatible avec
-- la version en cours, qui continue de lire "pin" tant qu'elle tourne.
ALTER TABLE "BuildingEmployee" ADD COLUMN "pinHash" TEXT;

CREATE UNIQUE INDEX "BuildingEmployee_one_active_pin_hash_idx" ON "BuildingEmployee"("buildingId", "pinHash")
 WHERE "isActive" = true AND "pinHash" IS NOT NULL;
