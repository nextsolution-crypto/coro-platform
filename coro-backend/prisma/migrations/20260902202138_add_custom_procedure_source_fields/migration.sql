-- DropForeignKey
ALTER TABLE "CustomProcedure" DROP CONSTRAINT "CustomProcedure_organizationId_fkey";

-- AlterTable
ALTER TABLE "CustomProcedure" ADD COLUMN     "isGlobal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourceFileName" TEXT,
ADD COLUMN     "sourceType" TEXT NOT NULL DEFAULT 'MANUAL',
ALTER COLUMN "organizationId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "CustomProcedure" ADD CONSTRAINT "CustomProcedure_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
