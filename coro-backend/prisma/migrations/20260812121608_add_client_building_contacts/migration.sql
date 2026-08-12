/*
  Warnings:

  - You are about to drop the column `responsableNom` on the `Building` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Building" DROP COLUMN "responsableNom",
ADD COLUMN     "responsableEmail" TEXT,
ADD COLUMN     "responsableFirstName" TEXT,
ADD COLUMN     "responsableLastName" TEXT,
ADD COLUMN     "responsablePhone" TEXT;

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactFirstName" TEXT,
ADD COLUMN     "contactLastName" TEXT,
ADD COLUMN     "contactPhone" TEXT;

-- AlterTable
ALTER TABLE "ClientUser" ADD COLUMN     "buildingIds" TEXT[];
