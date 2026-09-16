-- CreateEnum
CREATE TYPE "ExerciseReportStatus" AS ENUM ('DRAFT', 'FINALIZING', 'PUBLISHED', 'PUBLICATION_FAILED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ExerciseReportType" AS ENUM ('TABLETOP', 'EVACUATION');

-- CreateEnum
CREATE TYPE "ExerciseDataSource" AS ENUM ('CORO', 'SENTINELLE', 'REX', 'DOCX_EXTRACTED', 'AI_INFERRED', 'MANUAL');

-- CreateEnum
CREATE TYPE "ExerciseFindingType" AS ENUM ('POSITIVE', 'GAP');

-- CreateEnum
CREATE TYPE "ExerciseTimelineEntryType" AS ENUM ('INPUT', 'RESPONSE');

-- CreateEnum
CREATE TYPE "ExerciseReportImportStatus" AS ENUM ('PENDING', 'EXTRACTED', 'ANALYZED', 'REVIEWED', 'FAILED');

-- CreateEnum
CREATE TYPE "ComplianceRequirementType" AS ENUM ('EXERCISE', 'TRAINING', 'DOCUMENT', 'QUALIFICATION', 'OTHER');

-- CreateEnum
CREATE TYPE "ComplianceRequirementScope" AS ENUM ('GLOBAL', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "ComplianceEvidenceSourceType" AS ENUM ('EXERCISE_REPORT', 'TRAINING_RECORD', 'PROJECT_DOCUMENT', 'EMPLOYEE_QUALIFICATION', 'MANUAL');

-- CreateEnum
CREATE TYPE "ComplianceEvidenceStatus" AS ENUM ('PENDING', 'VALID', 'EXPIRED', 'REVOKED');

-- AlterTable
ALTER TABLE "CorrectiveAction" ADD COLUMN     "exerciseActionItemId" TEXT,
ADD COLUMN     "exerciseReportId" TEXT,
ADD COLUMN     "sourceFindingId" TEXT,
ADD COLUMN     "sourceRecommendationId" TEXT;

-- AlterTable
ALTER TABLE "ProjectActivity" ADD COLUMN     "bookingId" TEXT;

-- CreateTable
CREATE TABLE "ExerciseReport" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "bookingId" TEXT,
    "incidentEventId" TEXT,
    "evacuationEventId" TEXT,
    "officialFileId" TEXT,
    "type" "ExerciseReportType" NOT NULL,
    "status" "ExerciseReportStatus" NOT NULL DEFAULT 'DRAFT',
    "activityLabel" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "occurredAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "zones" TEXT[],
    "mandateName" TEXT,
    "providerName" TEXT,
    "adviserName" TEXT,
    "buildingName" TEXT NOT NULL,
    "buildingAddress" TEXT NOT NULL,
    "level" TEXT,
    "difficulty" TEXT,
    "scenario" TEXT,
    "positiveIntro" TEXT,
    "globalRating" TEXT,
    "summaryTitle" TEXT,
    "conclusion" TEXT,
    "preparedBy" TEXT,
    "recipient" TEXT,
    "conclusionDate" TIMESTAMP(3),
    "fieldProvenance" JSONB,
    "createdById" TEXT NOT NULL,
    "finalizedById" TEXT,
    "finalizedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExerciseReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseParticipant" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT,
    "simulatedRole" TEXT,
    "teamFunction" TEXT,
    "observations" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "source" "ExerciseDataSource" NOT NULL DEFAULT 'MANUAL',
    "confidence" DOUBLE PRECISION,
    "sourceRef" TEXT,
    "validatedById" TEXT,
    "validatedAt" TIMESTAMP(3),
    "isHumanModified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExerciseParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseTimelineEntry" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3),
    "type" "ExerciseTimelineEntryType" NOT NULL,
    "event" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "source" "ExerciseDataSource" NOT NULL DEFAULT 'MANUAL',
    "confidence" DOUBLE PRECISION,
    "sourceRef" TEXT,
    "validatedById" TEXT,
    "validatedAt" TIMESTAMP(3),
    "isHumanModified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExerciseTimelineEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseFinding" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "type" "ExerciseFindingType" NOT NULL,
    "title" TEXT,
    "description" TEXT NOT NULL,
    "priority" TEXT,
    "impact" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "source" "ExerciseDataSource" NOT NULL DEFAULT 'MANUAL',
    "confidence" DOUBLE PRECISION,
    "sourceRef" TEXT,
    "validatedById" TEXT,
    "validatedAt" TIMESTAMP(3),
    "isHumanModified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExerciseFinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseRecommendation" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "findingId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "priority" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "source" "ExerciseDataSource" NOT NULL DEFAULT 'MANUAL',
    "confidence" DOUBLE PRECISION,
    "sourceRef" TEXT,
    "validatedById" TEXT,
    "validatedAt" TIMESTAMP(3),
    "isHumanModified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExerciseRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseActionItem" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "findingId" TEXT,
    "recommendationId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignedTo" TEXT,
    "dueDate" TIMESTAMP(3),
    "priority" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "source" "ExerciseDataSource" NOT NULL DEFAULT 'MANUAL',
    "confidence" DOUBLE PRECISION,
    "sourceRef" TEXT,
    "validatedById" TEXT,
    "validatedAt" TIMESTAMP(3),
    "isHumanModified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExerciseActionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseReportVersion" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExerciseReportVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseReportImport" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT,
    "extractedText" TEXT,
    "structuredData" JSONB,
    "status" "ExerciseReportImportStatus" NOT NULL DEFAULT 'PENDING',
    "schemaVersion" TEXT,
    "errorMessage" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExerciseReportImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceRequirement" (
    "id" TEXT NOT NULL,
    "scope" "ComplianceRequirementScope" NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "organizationId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "ComplianceRequirementType" NOT NULL,
    "defaultValidityDays" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildingRequirement" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "validityDays" INTEGER,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "configuration" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuildingRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceEvidence" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "sourceType" "ComplianceEvidenceSourceType" NOT NULL,
    "sourceRecordId" TEXT NOT NULL,
    "sourceVersion" TEXT,
    "sourceHash" TEXT,
    "exerciseReportId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "status" "ComplianceEvidenceStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseReport_activityId_key" ON "ExerciseReport"("activityId");

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseReport_officialFileId_key" ON "ExerciseReport"("officialFileId");

-- CreateIndex
CREATE INDEX "ExerciseReport_organizationId_idx" ON "ExerciseReport"("organizationId");

-- CreateIndex
CREATE INDEX "ExerciseReport_projectId_idx" ON "ExerciseReport"("projectId");

-- CreateIndex
CREATE INDEX "ExerciseReport_buildingId_idx" ON "ExerciseReport"("buildingId");

-- CreateIndex
CREATE INDEX "ExerciseReport_bookingId_idx" ON "ExerciseReport"("bookingId");

-- CreateIndex
CREATE INDEX "ExerciseReport_incidentEventId_idx" ON "ExerciseReport"("incidentEventId");

-- CreateIndex
CREATE INDEX "ExerciseReport_evacuationEventId_idx" ON "ExerciseReport"("evacuationEventId");

-- CreateIndex
CREATE INDEX "ExerciseReport_status_idx" ON "ExerciseReport"("status");

-- CreateIndex
CREATE INDEX "ExerciseParticipant_reportId_idx" ON "ExerciseParticipant"("reportId");

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseParticipant_reportId_key_key" ON "ExerciseParticipant"("reportId", "key");

-- CreateIndex
CREATE INDEX "ExerciseTimelineEntry_reportId_idx" ON "ExerciseTimelineEntry"("reportId");

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseTimelineEntry_reportId_key_key" ON "ExerciseTimelineEntry"("reportId", "key");

-- CreateIndex
CREATE INDEX "ExerciseFinding_reportId_idx" ON "ExerciseFinding"("reportId");

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseFinding_reportId_key_key" ON "ExerciseFinding"("reportId", "key");

-- CreateIndex
CREATE INDEX "ExerciseRecommendation_reportId_idx" ON "ExerciseRecommendation"("reportId");

-- CreateIndex
CREATE INDEX "ExerciseRecommendation_findingId_idx" ON "ExerciseRecommendation"("findingId");

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseRecommendation_reportId_key_key" ON "ExerciseRecommendation"("reportId", "key");

-- CreateIndex
CREATE INDEX "ExerciseActionItem_reportId_idx" ON "ExerciseActionItem"("reportId");

-- CreateIndex
CREATE INDEX "ExerciseActionItem_findingId_idx" ON "ExerciseActionItem"("findingId");

-- CreateIndex
CREATE INDEX "ExerciseActionItem_recommendationId_idx" ON "ExerciseActionItem"("recommendationId");

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseActionItem_reportId_key_key" ON "ExerciseActionItem"("reportId", "key");

-- CreateIndex
CREATE INDEX "ExerciseReportVersion_reportId_idx" ON "ExerciseReportVersion"("reportId");

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseReportVersion_reportId_versionNumber_key" ON "ExerciseReportVersion"("reportId", "versionNumber");

-- CreateIndex
CREATE INDEX "ExerciseReportImport_reportId_idx" ON "ExerciseReportImport"("reportId");

-- CreateIndex
CREATE INDEX "ComplianceRequirement_type_idx" ON "ComplianceRequirement"("type");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceRequirement_scopeKey_code_key" ON "ComplianceRequirement"("scopeKey", "code");

-- CreateIndex
CREATE INDEX "BuildingRequirement_requirementId_idx" ON "BuildingRequirement"("requirementId");

-- CreateIndex
CREATE UNIQUE INDEX "BuildingRequirement_buildingId_requirementId_key" ON "BuildingRequirement"("buildingId", "requirementId");

-- CreateIndex
CREATE INDEX "ComplianceEvidence_organizationId_idx" ON "ComplianceEvidence"("organizationId");

-- CreateIndex
CREATE INDEX "ComplianceEvidence_buildingId_idx" ON "ComplianceEvidence"("buildingId");

-- CreateIndex
CREATE INDEX "ComplianceEvidence_requirementId_idx" ON "ComplianceEvidence"("requirementId");

-- CreateIndex
CREATE INDEX "ComplianceEvidence_exerciseReportId_idx" ON "ComplianceEvidence"("exerciseReportId");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceEvidence_requirementId_sourceType_sourceRecordId_key" ON "ComplianceEvidence"("requirementId", "sourceType", "sourceRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "CorrectiveAction_exerciseActionItemId_key" ON "CorrectiveAction"("exerciseActionItemId");

-- CreateIndex
CREATE INDEX "CorrectiveAction_incidentId_idx" ON "CorrectiveAction"("incidentId");

-- CreateIndex
CREATE INDEX "CorrectiveAction_exerciseReportId_idx" ON "CorrectiveAction"("exerciseReportId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectActivity_bookingId_key" ON "ProjectActivity"("bookingId");

-- AddForeignKey
ALTER TABLE "ProjectActivity" ADD CONSTRAINT "ProjectActivity_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseReport" ADD CONSTRAINT "ExerciseReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseReport" ADD CONSTRAINT "ExerciseReport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseReport" ADD CONSTRAINT "ExerciseReport_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "ProjectActivity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseReport" ADD CONSTRAINT "ExerciseReport_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseReport" ADD CONSTRAINT "ExerciseReport_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseReport" ADD CONSTRAINT "ExerciseReport_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseReport" ADD CONSTRAINT "ExerciseReport_incidentEventId_fkey" FOREIGN KEY ("incidentEventId") REFERENCES "IncidentEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseReport" ADD CONSTRAINT "ExerciseReport_evacuationEventId_fkey" FOREIGN KEY ("evacuationEventId") REFERENCES "EvacuationEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseReport" ADD CONSTRAINT "ExerciseReport_officialFileId_fkey" FOREIGN KEY ("officialFileId") REFERENCES "ProjectFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseReport" ADD CONSTRAINT "ExerciseReport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseReport" ADD CONSTRAINT "ExerciseReport_finalizedById_fkey" FOREIGN KEY ("finalizedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseParticipant" ADD CONSTRAINT "ExerciseParticipant_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ExerciseReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseParticipant" ADD CONSTRAINT "ExerciseParticipant_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseTimelineEntry" ADD CONSTRAINT "ExerciseTimelineEntry_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ExerciseReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseTimelineEntry" ADD CONSTRAINT "ExerciseTimelineEntry_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseFinding" ADD CONSTRAINT "ExerciseFinding_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ExerciseReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseFinding" ADD CONSTRAINT "ExerciseFinding_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseRecommendation" ADD CONSTRAINT "ExerciseRecommendation_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ExerciseReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseRecommendation" ADD CONSTRAINT "ExerciseRecommendation_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "ExerciseFinding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseRecommendation" ADD CONSTRAINT "ExerciseRecommendation_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseActionItem" ADD CONSTRAINT "ExerciseActionItem_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ExerciseReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseActionItem" ADD CONSTRAINT "ExerciseActionItem_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "ExerciseFinding"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseActionItem" ADD CONSTRAINT "ExerciseActionItem_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "ExerciseRecommendation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseActionItem" ADD CONSTRAINT "ExerciseActionItem_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseReportVersion" ADD CONSTRAINT "ExerciseReportVersion_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ExerciseReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseReportVersion" ADD CONSTRAINT "ExerciseReportVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseReportImport" ADD CONSTRAINT "ExerciseReportImport_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ExerciseReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseReportImport" ADD CONSTRAINT "ExerciseReportImport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceRequirement" ADD CONSTRAINT "ComplianceRequirement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildingRequirement" ADD CONSTRAINT "BuildingRequirement_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildingRequirement" ADD CONSTRAINT "BuildingRequirement_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "ComplianceRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceEvidence" ADD CONSTRAINT "ComplianceEvidence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceEvidence" ADD CONSTRAINT "ComplianceEvidence_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceEvidence" ADD CONSTRAINT "ComplianceEvidence_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "ComplianceRequirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceEvidence" ADD CONSTRAINT "ComplianceEvidence_exerciseReportId_fkey" FOREIGN KEY ("exerciseReportId") REFERENCES "ExerciseReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "IncidentEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_exerciseReportId_fkey" FOREIGN KEY ("exerciseReportId") REFERENCES "ExerciseReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_sourceFindingId_fkey" FOREIGN KEY ("sourceFindingId") REFERENCES "ExerciseFinding"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_sourceRecommendationId_fkey" FOREIGN KEY ("sourceRecommendationId") REFERENCES "ExerciseRecommendation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_exerciseActionItemId_fkey" FOREIGN KEY ("exerciseActionItemId") REFERENCES "ExerciseActionItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
