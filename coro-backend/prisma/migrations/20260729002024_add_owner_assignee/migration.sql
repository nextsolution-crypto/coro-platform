-- AlterTable
ALTER TABLE "ProjectMandate" ADD COLUMN     "ownerId" TEXT;

-- AlterTable
ALTER TABLE "ProjectTask" ADD COLUMN     "assigneeId" TEXT;

-- AddForeignKey
ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMandate" ADD CONSTRAINT "ProjectMandate_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
