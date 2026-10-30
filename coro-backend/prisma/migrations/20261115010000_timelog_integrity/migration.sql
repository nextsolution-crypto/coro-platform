ALTER TABLE "TimelogEntry"
ADD COLUMN "lockVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "clientRequestId" TEXT;

CREATE UNIQUE INDEX "TimelogEntry_organizationId_userId_clientRequestId_key"
ON "TimelogEntry"("organizationId", "userId", "clientRequestId");
