-- Bouton panique typé et réponses à deux sens (audit M2-02, M2-05).
-- Nouvelles tables seulement : compatible avec la version en cours.
CREATE TABLE "PanicAlert" (
  "id" TEXT NOT NULL,
  "buildingId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "panicType" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "triggeredBy" TEXT NOT NULL,
  "clientUserId" TEXT,
  "coordinatorName" TEXT,
  "notifiedCount" INTEGER NOT NULL DEFAULT 0,
  "occupantCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PanicAlert_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PanicAlert_buildingId_createdAt_idx" ON "PanicAlert"("buildingId", "createdAt");
CREATE INDEX "PanicAlert_organizationId_createdAt_idx" ON "PanicAlert"("organizationId", "createdAt");

CREATE TABLE "PanicRecipient" (
  "id" TEXT NOT NULL,
  "panicAlertId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "role" TEXT,
  "audience" TEXT NOT NULL,
  "emailMasked" TEXT,
  "phoneMasked" TEXT,
  "emailAccepted" BOOLEAN,
  "smsAccepted" BOOLEAN,
  "responseTokenHash" TEXT,
  "responseExpiresAt" TIMESTAMP(3),
  "response" TEXT,
  "respondedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PanicRecipient_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PanicRecipient_responseTokenHash_key" ON "PanicRecipient"("responseTokenHash");
CREATE INDEX "PanicRecipient_panicAlertId_idx" ON "PanicRecipient"("panicAlertId");
ALTER TABLE "PanicRecipient" ADD CONSTRAINT "PanicRecipient_panicAlertId_fkey" FOREIGN KEY ("panicAlertId") REFERENCES "PanicAlert"("id") ON DELETE CASCADE ON UPDATE CASCADE;
