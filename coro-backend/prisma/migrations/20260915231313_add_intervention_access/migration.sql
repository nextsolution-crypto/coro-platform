-- AlterTable
ALTER TABLE "IncidentEvent" ADD COLUMN     "interventionSheet" JSONB,
ADD COLUMN     "publicAccessToken" TEXT,
ADD COLUMN     "publicAccessCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "publicAccessLastAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "IncidentEvent_publicAccessToken_key" ON "IncidentEvent"("publicAccessToken");
