-- CreateEnum
CREATE TYPE "PlanSection" AS ENUM ('IMPLANTATION', 'COUPE', 'OPERATION', 'SECTEURS', 'DIVERS');

-- CreateTable
CREATE TABLE "BuildingPlan" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "section" "PlanSection" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fileBase64" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "emissionDate" TEXT,
    "revision" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuildingPlan_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BuildingPlan" ADD CONSTRAINT "BuildingPlan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
