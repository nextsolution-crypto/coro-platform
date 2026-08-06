-- CreateTable
CREATE TABLE "DangerousSubstance" (
    "id" TEXT NOT NULL,
    "unNumber" TEXT NOT NULL,
    "nameFR" TEXT NOT NULL,
    "nameEN" TEXT NOT NULL,
    "casNumber" TEXT,
    "tmdClass" TEXT NOT NULL,
    "tmdClassLabel" TEXT NOT NULL,
    "packingGroup" TEXT,
    "simdutClass" TEXT,
    "simdutLabel" TEXT,
    "placardCode" TEXT NOT NULL,
    "keywords" TEXT[],
    "isCommon" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DangerousSubstance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DangerousSubstance_unNumber_idx" ON "DangerousSubstance"("unNumber");

-- CreateIndex
CREATE INDEX "DangerousSubstance_nameFR_idx" ON "DangerousSubstance"("nameFR");
