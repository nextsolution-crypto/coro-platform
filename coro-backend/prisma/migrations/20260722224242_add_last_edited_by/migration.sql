-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "lastEditedById" TEXT;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_lastEditedById_fkey" FOREIGN KEY ("lastEditedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
