CREATE TYPE "PublicKnowledgeSourceType" AS ENUM ('SITE_PAGE', 'MODULE_PAGE', 'BLOG_ARTICLE', 'FAQ', 'PRODUCT_CAPABILITY', 'COMMERCIAL_INFORMATION', 'PUBLIC_DOCUMENTATION');
CREATE TYPE "PublicKnowledgeLanguage" AS ENUM ('FR_CA', 'EN_CA');
CREATE TYPE "PublicKnowledgePublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED');
CREATE TYPE "PublicKnowledgeAuthorityStatus" AS ENUM ('APPROVED', 'PENDING_REVIEW', 'REVOKED');
CREATE TYPE "PublicKnowledgeCapabilityStatus" AS ENUM ('AVAILABLE', 'PILOT', 'IN_DEVELOPMENT', 'PLANNED', 'RETIRED', 'UNKNOWN');

CREATE TABLE "PublicKnowledgeSource" (
  "id" TEXT NOT NULL,
  "sourceKey" TEXT NOT NULL,
  "sourceType" "PublicKnowledgeSourceType" NOT NULL,
  "canonicalUrl" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "language" "PublicKnowledgeLanguage" NOT NULL,
  "publicationStatus" "PublicKnowledgePublicationStatus" NOT NULL DEFAULT 'DRAFT',
  "authorityStatus" "PublicKnowledgeAuthorityStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "authorityRank" INTEGER NOT NULL DEFAULT 100,
  "version" INTEGER NOT NULL DEFAULT 1,
  "contentHash" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3),
  "sourceUpdatedAt" TIMESTAMP(3),
  "indexedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PublicKnowledgeSource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PublicKnowledgeChunk" (
  "id" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "ordinal" INTEGER NOT NULL,
  "section" TEXT,
  "text" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "tokenCountApprox" INTEGER NOT NULL,
  "characterCount" INTEGER NOT NULL,
  "embedding" DOUBLE PRECISION[],
  "containsPromptInjection" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PublicKnowledgeChunk_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PublicKnowledgeCapability" (
  "id" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "capabilityKey" TEXT NOT NULL,
  "language" "PublicKnowledgeLanguage" NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" "PublicKnowledgeCapabilityStatus" NOT NULL DEFAULT 'UNKNOWN',
  "canonicalUrl" TEXT,
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "validFrom" TIMESTAMP(3),
  "validUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PublicKnowledgeCapability_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PublicKnowledgeSyncEvent" (
  "id" TEXT NOT NULL,
  "correlationId" TEXT NOT NULL,
  "engineVersion" TEXT NOT NULL,
  "corpusVersion" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "sourceCount" INTEGER NOT NULL DEFAULT 0,
  "createdCount" INTEGER NOT NULL DEFAULT 0,
  "updatedCount" INTEGER NOT NULL DEFAULT 0,
  "unchangedCount" INTEGER NOT NULL DEFAULT 0,
  "withdrawnCount" INTEGER NOT NULL DEFAULT 0,
  "rejectedCount" INTEGER NOT NULL DEFAULT 0,
  "errorCode" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "PublicKnowledgeSyncEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PublicKnowledgeSource_sourceKey_language_key" ON "PublicKnowledgeSource"("sourceKey", "language");
CREATE INDEX "PublicKnowledgeSource_canonicalUrl_language_idx" ON "PublicKnowledgeSource"("canonicalUrl", "language");
CREATE INDEX "PublicKnowledgeSource_publicationStatus_authorityStatus_language_idx" ON "PublicKnowledgeSource"("publicationStatus", "authorityStatus", "language");
CREATE INDEX "PublicKnowledgeSource_sourceType_authorityRank_idx" ON "PublicKnowledgeSource"("sourceType", "authorityRank");
CREATE INDEX "PublicKnowledgeSource_contentHash_idx" ON "PublicKnowledgeSource"("contentHash");
CREATE UNIQUE INDEX "PublicKnowledgeChunk_sourceId_ordinal_key" ON "PublicKnowledgeChunk"("sourceId", "ordinal");
CREATE INDEX "PublicKnowledgeChunk_contentHash_idx" ON "PublicKnowledgeChunk"("contentHash");
CREATE INDEX "PublicKnowledgeChunk_containsPromptInjection_idx" ON "PublicKnowledgeChunk"("containsPromptInjection");
CREATE UNIQUE INDEX "PublicKnowledgeCapability_capabilityKey_language_key" ON "PublicKnowledgeCapability"("capabilityKey", "language");
CREATE INDEX "PublicKnowledgeCapability_status_language_idx" ON "PublicKnowledgeCapability"("status", "language");
CREATE INDEX "PublicKnowledgeCapability_sourceId_idx" ON "PublicKnowledgeCapability"("sourceId");
CREATE UNIQUE INDEX "PublicKnowledgeSyncEvent_correlationId_key" ON "PublicKnowledgeSyncEvent"("correlationId");
CREATE INDEX "PublicKnowledgeSyncEvent_status_startedAt_idx" ON "PublicKnowledgeSyncEvent"("status", "startedAt");

ALTER TABLE "PublicKnowledgeChunk" ADD CONSTRAINT "PublicKnowledgeChunk_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "PublicKnowledgeSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PublicKnowledgeCapability" ADD CONSTRAINT "PublicKnowledgeCapability_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "PublicKnowledgeSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
