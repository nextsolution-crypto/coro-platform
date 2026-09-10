-- CreateTable
CREATE TABLE "ClientTrustedDevice" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientTrustedDevice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientTrustedDevice_token_key" ON "ClientTrustedDevice"("token");

-- AddForeignKey
ALTER TABLE "ClientTrustedDevice" ADD CONSTRAINT "ClientTrustedDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "ClientUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
