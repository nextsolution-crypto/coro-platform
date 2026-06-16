-- CreateTable
CREATE TABLE "Module7Data" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "quartsData" JSONB,
    "photosData" JSONB,
    "extraData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Module7Data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Module7Data_projectId_key" ON "Module7Data"("projectId");

-- AddForeignKey
ALTER TABLE "Module7Data" ADD CONSTRAINT "Module7Data_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
