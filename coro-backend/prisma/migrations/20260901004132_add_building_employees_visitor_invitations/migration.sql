-- AlterTable
ALTER TABLE "OccupancyRecord" ADD COLUMN     "employeeId" TEXT;

-- CreateTable
CREATE TABLE "BuildingEmployee" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "poste" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "qrToken" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuildingEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitorInvitation" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "reason" TEXT,
    "hostName" TEXT,
    "visitDate" TIMESTAMP(3) NOT NULL,
    "qrToken" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "invitedById" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisitorInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BuildingEmployee_qrToken_key" ON "BuildingEmployee"("qrToken");

-- CreateIndex
CREATE UNIQUE INDEX "VisitorInvitation_qrToken_key" ON "VisitorInvitation"("qrToken");

-- AddForeignKey
ALTER TABLE "OccupancyRecord" ADD CONSTRAINT "OccupancyRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "BuildingEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildingEmployee" ADD CONSTRAINT "BuildingEmployee_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitorInvitation" ADD CONSTRAINT "VisitorInvitation_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
