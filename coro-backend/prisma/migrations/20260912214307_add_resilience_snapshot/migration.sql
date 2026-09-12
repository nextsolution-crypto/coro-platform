-- CreateTable
CREATE TABLE "ResilienceSnapshot" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "rolesScore" INTEGER NOT NULL,
    "qualScore" INTEGER NOT NULL,
    "plansScore" INTEGER NOT NULL,
    "exercisesScore" INTEGER NOT NULL,
    "presentMembers" INTEGER NOT NULL,
    "totalMembers" INTEGER NOT NULL,
    "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResilienceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResilienceSnapshot_buildingId_idx" ON "ResilienceSnapshot"("buildingId");

-- CreateIndex
CREATE INDEX "ResilienceSnapshot_snapshotAt_idx" ON "ResilienceSnapshot"("snapshotAt");

-- AddForeignKey
ALTER TABLE "ResilienceSnapshot" ADD CONSTRAINT "ResilienceSnapshot_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
