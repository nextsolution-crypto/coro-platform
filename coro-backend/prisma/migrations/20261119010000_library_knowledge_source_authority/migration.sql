ALTER TABLE "CoroKnowledgeInteractionSource"
  ADD COLUMN "sourceType" TEXT NOT NULL DEFAULT 'PROJECT_FILE',
  ADD COLUMN "sourceReference" TEXT,
  ADD COLUMN "sourceVersion" TEXT,
  ADD COLUMN "sourceFingerprint" TEXT,
  ALTER COLUMN "citationId" DROP NOT NULL,
  ALTER COLUMN "chunkId" DROP NOT NULL;

UPDATE "CoroKnowledgeInteractionSource" source
SET "sourceReference" = 'project-file-citation:' || source."citationId",
    "sourceVersion" = ingestion."sourceVersion"::text,
    "sourceFingerprint" = citation."sourceSha256"
FROM "ProjectFileKnowledgeCitation" citation
JOIN "ProjectFileKnowledgeIngestion" ingestion ON ingestion."id" = citation."ingestionId"
WHERE citation."id" = source."citationId";

ALTER TABLE "CoroKnowledgeInteractionSource"
  ALTER COLUMN "sourceReference" SET NOT NULL,
  ALTER COLUMN "sourceVersion" SET NOT NULL,
  ALTER COLUMN "sourceFingerprint" SET NOT NULL,
  ADD CONSTRAINT "CoroKnowledgeInteractionSource_typed_source_check" CHECK (
    ("sourceType" = 'PROJECT_FILE' AND "citationId" IS NOT NULL AND "chunkId" IS NOT NULL)
    OR ("sourceType" = 'LIBRARY_PROCEDURE' AND "citationId" IS NULL AND "chunkId" IS NULL)
  );

CREATE UNIQUE INDEX "CoroKnowledgeInteractionSource_interactionId_sourceType_sourceReference_key"
  ON "CoroKnowledgeInteractionSource"("interactionId", "sourceType", "sourceReference");
CREATE INDEX "CoroKnowledgeInteractionSource_sourceType_sourceReference_createdAt_idx"
  ON "CoroKnowledgeInteractionSource"("sourceType", "sourceReference", "createdAt");
