-- CreateTable
CREATE TABLE "DocumentEngagement" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "clientUserId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "device" TEXT,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentEngagement_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DocumentEngagement" ADD CONSTRAINT "DocumentEngagement_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentEngagement" ADD CONSTRAINT "DocumentEngagement_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "ClientUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
