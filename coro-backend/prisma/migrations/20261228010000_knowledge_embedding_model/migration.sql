-- CORO Knowledge : modèle des vecteurs sémantiques (ajout rétrocompatible).
ALTER TABLE "ProjectFileKnowledgeChunk" ADD COLUMN "embeddingModel" TEXT;
CREATE INDEX "ProjectFileKnowledgeChunk_embeddingModel_idx" ON "ProjectFileKnowledgeChunk"("embeddingModel");
