-- AlterTable
ALTER TABLE "User" ADD COLUMN     "horaireBase" DOUBLE PRECISION NOT NULL DEFAULT 40;

-- CreateTable
CREATE TABLE "TimelogEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "heures" DOUBLE PRECISION NOT NULL,
    "category" TEXT NOT NULL,
    "note" TEXT,
    "isBillable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimelogEntry_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TimelogEntry" ADD CONSTRAINT "TimelogEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
