-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "submittedById" TEXT;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
