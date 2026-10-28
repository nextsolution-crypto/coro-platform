CREATE TYPE "WebAICommercialRequestType" AS ENUM ('DEMO', 'QUOTE', 'CONTACT', 'PARTNERSHIP');
CREATE TYPE "WebAICommercialRequestStatus" AS ENUM ('SUBMITTED', 'FAILED', 'PROCESSED');
CREATE TYPE "WebAITelemetryResult" AS ENUM ('SUCCESS', 'ABSTENTION', 'REJECTED', 'FAILURE');
CREATE TYPE "WebAIImprovementStatus" AS ENUM ('NEW', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED');

CREATE TABLE "WebAICommercialRequest" (
    "id" TEXT NOT NULL,
    "idempotencyKey" UUID NOT NULL,
    "payloadFingerprint" CHAR(64) NOT NULL,
    "requestType" "WebAICommercialRequestType" NOT NULL,
    "status" "WebAICommercialRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "prospectId" TEXT,
    "contactName" VARCHAR(160) NOT NULL,
    "organizationName" VARCHAR(200) NOT NULL,
    "contactTitle" VARCHAR(160),
    "email" VARCHAR(254) NOT NULL,
    "sector" VARCHAR(80),
    "buildingCount" INTEGER,
    "estimatedUsers" INTEGER,
    "primaryNeed" VARCHAR(500),
    "interestedModules" TEXT[] NOT NULL,
    "timeline" VARCHAR(80),
    "preferredLanguage" "PublicKnowledgeLanguage" NOT NULL,
    "consentToProcess" BOOLEAN NOT NULL,
    "consentTextVersion" VARCHAR(40) NOT NULL,
    "consentAction" VARCHAR(80) NOT NULL,
    "consentTimestamp" TIMESTAMP(3) NOT NULL,
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "providerMode" VARCHAR(30) NOT NULL DEFAULT 'SIMULATED',
    "providerCorrelationId" VARCHAR(120),
    "failureCode" VARCHAR(80),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WebAICommercialRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WebAICommercialRequest_idempotencyKey_key" ON "WebAICommercialRequest"("idempotencyKey");
CREATE INDEX "WebAICommercialRequest_status_createdAt_idx" ON "WebAICommercialRequest"("status", "createdAt");
CREATE INDEX "WebAICommercialRequest_requestType_createdAt_idx" ON "WebAICommercialRequest"("requestType", "createdAt");
CREATE INDEX "WebAICommercialRequest_prospectId_idx" ON "WebAICommercialRequest"("prospectId");
ALTER TABLE "WebAICommercialRequest" ADD CONSTRAINT "WebAICommercialRequest_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "CommercialProspect"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "WebAITelemetryEvent" (
    "id" TEXT NOT NULL,
    "eventKey" UUID NOT NULL,
    "sessionPseudonym" VARCHAR(64),
    "correlationId" VARCHAR(64) NOT NULL,
    "eventType" VARCHAR(60) NOT NULL,
    "category" VARCHAR(80) NOT NULL,
    "language" "PublicKnowledgeLanguage" NOT NULL,
    "result" "WebAITelemetryResult" NOT NULL,
    "providerMode" VARCHAR(30),
    "durationMs" INTEGER,
    "sourceCount" INTEGER,
    "suggestedLinkCount" INTEGER,
    "tokenCount" INTEGER,
    "estimatedCostMicros" BIGINT,
    "errorCode" VARCHAR(80),
    "classifierVersion" VARCHAR(40) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebAITelemetryEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WebAITelemetryEvent_eventKey_key" ON "WebAITelemetryEvent"("eventKey");
CREATE INDEX "WebAITelemetryEvent_createdAt_eventType_idx" ON "WebAITelemetryEvent"("createdAt", "eventType");
CREATE INDEX "WebAITelemetryEvent_category_createdAt_idx" ON "WebAITelemetryEvent"("category", "createdAt");
CREATE INDEX "WebAITelemetryEvent_result_createdAt_idx" ON "WebAITelemetryEvent"("result", "createdAt");

CREATE TABLE "WebAIImprovementRecommendation" (
    "id" TEXT NOT NULL,
    "category" VARCHAR(80) NOT NULL,
    "findingCode" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "frequencyObserved" INTEGER NOT NULL DEFAULT 1,
    "sourceStatistic" VARCHAR(120) NOT NULL,
    "proposedPriority" VARCHAR(20) NOT NULL,
    "status" "WebAIImprovementStatus" NOT NULL DEFAULT 'NEW',
    "firstObservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastObservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decision" VARCHAR(500),
    "closedAt" TIMESTAMP(3),
    CONSTRAINT "WebAIImprovementRecommendation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WebAIImprovementRecommendation_category_findingCode_key" ON "WebAIImprovementRecommendation"("category", "findingCode");
CREATE INDEX "WebAIImprovementRecommendation_status_proposedPriority_idx" ON "WebAIImprovementRecommendation"("status", "proposedPriority");
