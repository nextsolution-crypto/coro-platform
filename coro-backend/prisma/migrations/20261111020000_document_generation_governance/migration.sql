-- Additive request authority for atomic, replay-safe document generation.
-- Existing Document rows are not changed or remediated by this migration.
CREATE TABLE "DocumentGenerationRequest" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "expectedDocumentVersion" INTEGER NOT NULL,
    "documentId" TEXT NOT NULL,
    "documentVersion" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentGenerationRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DocumentGenerationRequest_projectId_idempotencyKey_key"
ON "DocumentGenerationRequest"("projectId", "idempotencyKey");

CREATE INDEX "DocumentGenerationRequest_organizationId_actorUserId_createdAt_idx"
ON "DocumentGenerationRequest"("organizationId", "actorUserId", "createdAt");

CREATE INDEX "DocumentGenerationRequest_documentId_idx"
ON "DocumentGenerationRequest"("documentId");

ALTER TABLE "DocumentGenerationRequest"
ADD CONSTRAINT "DocumentGenerationRequest_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DocumentGenerationRequest"
ADD CONSTRAINT "DocumentGenerationRequest_documentId_fkey"
FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
