CREATE TYPE "ProjectFileKnowledgeIngestionStatus" AS ENUM ('QUEUED', 'PROCESSING', 'READY', 'FAILED', 'STALE', 'REVOKED');
CREATE TYPE "ProjectFileKnowledgeExtractionMethod" AS ENUM ('NATIVE_TEXT', 'LOCAL_OCR');
CREATE TYPE "CoroKnowledgeActorType" AS ENUM ('INTERNAL_USER', 'CLIENT_USER');
CREATE TYPE "CoroKnowledgeAnswerStatus" AS ENUM ('ANSWERED', 'INSUFFICIENT_EVIDENCE', 'BLOCKED', 'PROVIDER_FAILURE');

CREATE TABLE "ProjectFileKnowledgeIngestion" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "projectFileId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "buildingId" TEXT NOT NULL,
  "sourceVersion" INTEGER NOT NULL,
  "sourceSha256" TEXT NOT NULL,
  "sourceLifecycle" "ProjectFileLifecycleState" NOT NULL,
  "sourceEffectiveAt" TIMESTAMP(3),
  "sourceExpiresAt" TIMESTAMP(3),
  "sourceVisibility" TEXT NOT NULL,
  "status" "ProjectFileKnowledgeIngestionStatus" NOT NULL DEFAULT 'QUEUED',
  "extractionMethod" "ProjectFileKnowledgeExtractionMethod" NOT NULL DEFAULT 'NATIVE_TEXT',
  "extractorName" TEXT NOT NULL,
  "extractorVersion" TEXT NOT NULL,
  "pipelineVersion" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "lastErrorCode" TEXT,
  "indexedAt" TIMESTAMP(3),
  "staleAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectFileKnowledgeIngestion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectFileKnowledgeIngestion_projectFileId_fkey" FOREIGN KEY ("projectFileId") REFERENCES "ProjectFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ProjectFileKnowledgeIngestion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ProjectFileKnowledgeIngestion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ProjectFileKnowledgeIngestion_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ProjectFileKnowledgeIngestion_sha256_check" CHECK ("sourceSha256" ~ '^[0-9a-f]{64}$')
);
CREATE UNIQUE INDEX "ProjectFileKnowledgeIngestion_idempotencyKey_key" ON "ProjectFileKnowledgeIngestion"("idempotencyKey");
CREATE UNIQUE INDEX "ProjectFileKnowledgeIngestion_projectFileId_sourceSha256_pipelineVersion_key" ON "ProjectFileKnowledgeIngestion"("projectFileId", "sourceSha256", "pipelineVersion");
CREATE INDEX "ProjectFileKnowledgeIngestion_organizationId_buildingId_status_idx" ON "ProjectFileKnowledgeIngestion"("organizationId", "buildingId", "status");
CREATE INDEX "ProjectFileKnowledgeIngestion_projectFileId_status_idx" ON "ProjectFileKnowledgeIngestion"("projectFileId", "status");

CREATE TABLE "ProjectFileKnowledgeChunk" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "ingestionId" TEXT NOT NULL,
  "ordinal" INTEGER NOT NULL,
  "pageStart" INTEGER NOT NULL,
  "pageEnd" INTEGER NOT NULL,
  "sectionPath" TEXT,
  "sectionTitle" TEXT,
  "text" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "tokenCountApprox" INTEGER NOT NULL,
  "characterCount" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "searchVector" tsvector GENERATED ALWAYS AS (to_tsvector('french', coalesce("sectionTitle", '') || ' ' || "text")) STORED,
  "embedding" DOUBLE PRECISION[] NOT NULL,
  CONSTRAINT "ProjectFileKnowledgeChunk_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectFileKnowledgeChunk_ingestionId_fkey" FOREIGN KEY ("ingestionId") REFERENCES "ProjectFileKnowledgeIngestion"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProjectFileKnowledgeChunk_contentHash_check" CHECK ("contentHash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "ProjectFileKnowledgeChunk_pages_check" CHECK ("pageStart" > 0 AND "pageEnd" >= "pageStart"),
  CONSTRAINT "ProjectFileKnowledgeChunk_embedding_check" CHECK (cardinality("embedding") = 64)
);
CREATE UNIQUE INDEX "ProjectFileKnowledgeChunk_ingestionId_ordinal_key" ON "ProjectFileKnowledgeChunk"("ingestionId", "ordinal");
CREATE INDEX "ProjectFileKnowledgeChunk_organizationId_ingestionId_idx" ON "ProjectFileKnowledgeChunk"("organizationId", "ingestionId");
CREATE INDEX "ProjectFileKnowledgeChunk_contentHash_idx" ON "ProjectFileKnowledgeChunk"("contentHash");
CREATE INDEX "ProjectFileKnowledgeChunk_searchVector_idx" ON "ProjectFileKnowledgeChunk" USING GIN ("searchVector");

CREATE TABLE "ProjectFileKnowledgeCitation" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "projectFileId" TEXT NOT NULL,
  "ingestionId" TEXT NOT NULL,
  "chunkId" TEXT NOT NULL,
  "sourceSha256" TEXT NOT NULL,
  "pageStart" INTEGER NOT NULL,
  "pageEnd" INTEGER NOT NULL,
  "sectionPath" TEXT,
  "startOffset" INTEGER,
  "endOffset" INTEGER,
  "contentHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectFileKnowledgeCitation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectFileKnowledgeCitation_projectFileId_fkey" FOREIGN KEY ("projectFileId") REFERENCES "ProjectFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ProjectFileKnowledgeCitation_ingestionId_fkey" FOREIGN KEY ("ingestionId") REFERENCES "ProjectFileKnowledgeIngestion"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProjectFileKnowledgeCitation_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "ProjectFileKnowledgeChunk"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ProjectFileKnowledgeCitation_ingestionId_chunkId_key" ON "ProjectFileKnowledgeCitation"("ingestionId", "chunkId");
CREATE INDEX "ProjectFileKnowledgeCitation_organizationId_projectFileId_pageStart_idx" ON "ProjectFileKnowledgeCitation"("organizationId", "projectFileId", "pageStart");

CREATE TABLE "CoroKnowledgeInteraction" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "actorType" "CoroKnowledgeActorType" NOT NULL,
  "actorId" TEXT NOT NULL,
  "buildingId" TEXT,
  "operationalContext" TEXT,
  "operationalResourceId" TEXT,
  "status" "CoroKnowledgeAnswerStatus" NOT NULL,
  "questionFingerprint" TEXT NOT NULL,
  "answerFingerprint" TEXT,
  "providerCode" TEXT NOT NULL DEFAULT 'DETERMINISTIC_SIMULATED',
  "sourceCount" INTEGER NOT NULL DEFAULT 0,
  "usedSourceCount" INTEGER NOT NULL DEFAULT 0,
  "uncertainty" TEXT,
  "suspiciousContent" BOOLEAN NOT NULL DEFAULT false,
  "correlationId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "CoroKnowledgeInteraction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CoroKnowledgeInteraction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CoroKnowledgeInteraction_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CoroKnowledgeInteraction_correlationId_key" ON "CoroKnowledgeInteraction"("correlationId");
CREATE INDEX "CoroKnowledgeInteraction_organizationId_actorType_actorId_createdAt_idx" ON "CoroKnowledgeInteraction"("organizationId", "actorType", "actorId", "createdAt");
CREATE INDEX "CoroKnowledgeInteraction_organizationId_buildingId_createdAt_idx" ON "CoroKnowledgeInteraction"("organizationId", "buildingId", "createdAt");

CREATE TABLE "CoroKnowledgeInteractionSource" (
  "id" TEXT NOT NULL,
  "interactionId" TEXT NOT NULL,
  "citationId" TEXT NOT NULL,
  "chunkId" TEXT NOT NULL,
  "retrievalRank" INTEGER NOT NULL,
  "retrievalScore" DOUBLE PRECISION NOT NULL,
  "usedInAnswer" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CoroKnowledgeInteractionSource_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CoroKnowledgeInteractionSource_interactionId_fkey" FOREIGN KEY ("interactionId") REFERENCES "CoroKnowledgeInteraction"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CoroKnowledgeInteractionSource_citationId_fkey" FOREIGN KEY ("citationId") REFERENCES "ProjectFileKnowledgeCitation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CoroKnowledgeInteractionSource_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "ProjectFileKnowledgeChunk"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CoroKnowledgeInteractionSource_interactionId_citationId_key" ON "CoroKnowledgeInteractionSource"("interactionId", "citationId");
CREATE INDEX "CoroKnowledgeInteractionSource_citationId_createdAt_idx" ON "CoroKnowledgeInteractionSource"("citationId", "createdAt");

-- Only READY ingestions backed by a currently APPROVED ProjectFile are retrievable.
-- Lifecycle reconciliation can mark prior projections STALE/REVOKED without deleting evidence.
CREATE OR REPLACE FUNCTION prevent_knowledge_source_identity_mutation() RETURNS trigger AS $$
BEGIN
  IF NEW."projectFileId" <> OLD."projectFileId" OR NEW."sourceSha256" <> OLD."sourceSha256" OR NEW."sourceVersion" <> OLD."sourceVersion" THEN
    RAISE EXCEPTION 'Canonical ProjectFile source identity is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "ProjectFileKnowledgeIngestion_source_immutable"
BEFORE UPDATE ON "ProjectFileKnowledgeIngestion"
FOR EACH ROW EXECUTE FUNCTION prevent_knowledge_source_identity_mutation();
