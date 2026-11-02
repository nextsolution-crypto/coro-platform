CREATE TYPE "QrCodeStatus" AS ENUM ('ACTIVE', 'DISABLED');

CREATE TABLE "QrCode" (
  "id" UUID NOT NULL,
  "slug" TEXT NOT NULL,
  "permanentPath" TEXT NOT NULL,
  "destinationUrl" TEXT NOT NULL,
  "status" "QrCodeStatus" NOT NULL DEFAULT 'ACTIVE',
  "configurationVersion" INTEGER NOT NULL DEFAULT 1,
  "humanScanCount" INTEGER NOT NULL DEFAULT 0,
  "technicalRequestCount" INTEGER NOT NULL DEFAULT 0,
  "lastScanAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QrCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QrCodeChange" (
  "id" UUID NOT NULL,
  "qrCodeId" UUID NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "previousState" JSONB,
  "nextState" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QrCodeChange_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "QrCode_slug_key" ON "QrCode"("slug");
CREATE UNIQUE INDEX "QrCode_permanentPath_key" ON "QrCode"("permanentPath");
CREATE INDEX "QrCode_status_idx" ON "QrCode"("status");
CREATE INDEX "QrCodeChange_qrCodeId_createdAt_idx" ON "QrCodeChange"("qrCodeId", "createdAt");
CREATE INDEX "QrCodeChange_actorUserId_createdAt_idx" ON "QrCodeChange"("actorUserId", "createdAt");
ALTER TABLE "QrCodeChange" ADD CONSTRAINT "QrCodeChange_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES "QrCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "QrCode" (
  "id", "slug", "permanentPath", "destinationUrl", "status", "updatedAt"
) VALUES (
  '9a2b1dd0-1492-4f29-9f99-3b2477287e5d',
  'contact',
  '/qr/contact',
  'https://getcoro.io/contact',
  'ACTIVE',
  CURRENT_TIMESTAMP
) ON CONFLICT ("slug") DO NOTHING;
