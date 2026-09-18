-- CreateEnum
CREATE TYPE "RueAssessmentStatus" AS ENUM ('NOT_ASSESSED', 'ASSESSMENT_IN_PROGRESS', 'CONFIRMED_SUBJECT', 'CONFIRMED_NOT_SUBJECT', 'EXEMPT');

-- CreateEnum
CREATE TYPE "RueDataSource" AS ENUM ('MANUAL', 'PUE_CONFIGURATOR', 'IMPORT', 'GOVERNMENT_REFERENCE', 'INCIDENT');

-- CreateEnum
CREATE TYPE "CoroActorType" AS ENUM ('USER', 'CLIENT_USER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "RueAuthorityType" AS ENUM ('MUNICIPALITY', 'CIVIL_SECURITY', 'FIRE_DEPARTMENT', 'POLICE', 'EMS', 'ENVIRONMENTAL_AUTHORITY', 'PUBLIC_HEALTH', 'TRANSPORT_AUTHORITY', 'PUBLIC_UTILITY', 'OTHER_GOVERNMENT', 'COMMUNITY_OR_INTEREST_GROUP', 'OTHER');

-- CreateEnum
CREATE TYPE "RueSurroundingAssetType" AS ENUM ('HOSPITAL', 'SCHOOL', 'DAYCARE', 'SENIORS_RESIDENCE', 'RESIDENTIAL_BUILDING', 'COMMERCIAL_BUILDING', 'INDUSTRIAL_BUILDING', 'HIGHWAY', 'PUBLIC_TRANSIT', 'PARK', 'FOREST', 'WILDLIFE_HABITAT', 'WATER_SOURCE', 'WATER_BODY', 'OTHER');

-- CreateEnum
CREATE TYPE "RueEmergencyMeasurePhase" AS ENUM ('PREVENTION', 'PREPAREDNESS', 'RESPONSE', 'RECOVERY');

-- CreateEnum
CREATE TYPE "PopulationSubscriberStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'UNSUBSCRIBED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PopulationPreferredLanguage" AS ENUM ('FR', 'EN');

-- CreateEnum
CREATE TYPE "PopulationConsentEventType" AS ENUM ('SUBSCRIBED', 'VERIFIED', 'CONSENT_UPDATED', 'UNSUBSCRIBED');

-- CreateEnum
CREATE TYPE "PopulationVerificationChannel" AS ENUM ('SMS', 'EMAIL');

-- CreateEnum
CREATE TYPE "PopulationProgramStatus" AS ENUM ('NOT_CONFIGURED', 'CONFIGURING', 'READY', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PopulationAlertType" AS ENUM ('TEST', 'PRE_ALERT', 'EMERGENCY', 'UPDATE', 'ALL_CLEAR');

-- CreateEnum
CREATE TYPE "PopulationAlertStatus" AS ENUM ('DRAFT', 'READY', 'SENDING', 'ACTIVE', 'ENDED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "PopulationAlertChannel" AS ENUM ('SMS', 'EMAIL');

-- CreateEnum
CREATE TYPE "PopulationDeliveryStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RueScenarioType" AS ENUM ('WORST_CASE', 'ALTERNATIVE', 'OTHER');

-- CreateEnum
CREATE TYPE "RueProtectiveAction" AS ENUM ('SHELTER_IN_PLACE', 'EVACUATE', 'AVOID_AREA', 'OTHER');

-- CreateTable
CREATE TABLE "RueFacilityProfile" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "assessmentStatus" "RueAssessmentStatus" NOT NULL DEFAULT 'NOT_ASSESSED',
    "assessmentSource" "RueDataSource" NOT NULL DEFAULT 'MANUAL',
    "assessedAt" TIMESTAMP(3),
    "assessedByType" "CoroActorType",
    "assessedById" TEXT,
    "assessmentNotes" TEXT,
    "assessmentReference" TEXT,
    "populationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "pueProjectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RueFacilityProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PopulationProgram" (
    "id" TEXT NOT NULL,
    "rueFacilityProfileId" TEXT NOT NULL,
    "status" "PopulationProgramStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
    "publicSlug" TEXT NOT NULL,
    "nameFR" TEXT NOT NULL,
    "nameEN" TEXT,
    "descriptionFR" TEXT,
    "descriptionEN" TEXT,
    "publicPhone" TEXT,
    "publicEmail" TEXT,
    "websiteUrl" TEXT,
    "registrationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "privacyTextFR" TEXT,
    "privacyTextEN" TEXT,
    "consentTextFR" TEXT,
    "consentTextEN" TEXT,
    "consentVersion" TEXT,
    "activatedAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PopulationProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PopulationSubscriber" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "status" "PopulationSubscriberStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "preferredLanguage" "PopulationPreferredLanguage" NOT NULL DEFAULT 'FR',
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "locationSource" TEXT,
    "locationResolvedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "unsubscribedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PopulationSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PopulationConsentEvent" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "subscriberId" TEXT,
    "type" "PopulationConsentEventType" NOT NULL,
    "consentVersion" TEXT NOT NULL,
    "smsEnabled" BOOLEAN NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL,
    "source" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PopulationConsentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PopulationVerification" (
    "id" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "channel" "PopulationVerificationChannel" NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PopulationVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PopulationAlert" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "incidentEventId" TEXT,
    "emergencyScenarioId" TEXT,
    "type" "PopulationAlertType" NOT NULL,
    "status" "PopulationAlertStatus" NOT NULL DEFAULT 'DRAFT',
    "titleFR" TEXT NOT NULL,
    "titleEN" TEXT,
    "messageFR" TEXT NOT NULL,
    "messageEN" TEXT,
    "instructionFR" TEXT,
    "instructionEN" TEXT,
    "createdByType" "CoroActorType" NOT NULL,
    "createdById" TEXT NOT NULL,
    "approvedByType" "CoroActorType",
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "scheduledAt" TIMESTAMP(3),
    "sendingAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "contextSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PopulationAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PopulationAlertZone" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "impactZoneId" TEXT,
    "zoneCodeSnapshot" TEXT NOT NULL,
    "zoneNameFRSnapshot" TEXT NOT NULL,
    "zoneNameENSnapshot" TEXT,
    "geometrySnapshot" JSONB,
    "protectiveActionSnapshot" "RueProtectiveAction",
    "instructionFRSnapshot" TEXT,
    "instructionENSnapshot" TEXT,
    "targetedSubscriberCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PopulationAlertZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PopulationAlertDelivery" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "subscriberId" TEXT,
    "channel" "PopulationAlertChannel" NOT NULL,
    "status" "PopulationDeliveryStatus" NOT NULL DEFAULT 'QUEUED',
    "language" "PopulationPreferredLanguage" NOT NULL,
    "messageSnapshot" TEXT NOT NULL,
    "destinationSnapshot" TEXT,
    "providerMessageId" TEXT,
    "provider" TEXT,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PopulationAlertDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RueRegulatedSubstance" (
    "id" TEXT NOT NULL,
    "schedulePart" INTEGER NOT NULL,
    "scheduleItem" INTEGER NOT NULL,
    "casNumber" TEXT NOT NULL,
    "nameFR" TEXT NOT NULL,
    "nameEN" TEXT,
    "unNumbers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "minimumConcentrationPercent" DECIMAL(10,4) NOT NULL,
    "minimumQuantityTonnes" DECIMAL(14,6) NOT NULL,
    "hazardCategory" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "regulatorySource" TEXT,
    "regulatoryVersion" TEXT,
    "source" "RueDataSource" NOT NULL DEFAULT 'GOVERNMENT_REFERENCE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RueRegulatedSubstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RueFacilitySubstance" (
    "id" TEXT NOT NULL,
    "facilityProfileId" TEXT NOT NULL,
    "regulatedSubstanceId" TEXT NOT NULL,
    "concentrationPercent" DECIMAL(10,4),
    "maximumQuantityTonnes" DECIMAL(14,6),
    "hasQuantityOutsideContainerSystem" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "source" "RueDataSource" NOT NULL DEFAULT 'MANUAL',
    "sourceReference" TEXT,
    "validatedAt" TIMESTAMP(3),
    "validatedByType" "CoroActorType",
    "validatedById" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RueFacilitySubstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RueFacilityContainerSystem" (
    "id" TEXT NOT NULL,
    "facilitySubstanceId" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "maximumCapacityTonnes" DECIMAL(14,6) NOT NULL,
    "maximumExpectedQuantityTonnes" DECIMAL(14,6),
    "locationDescription" TEXT,
    "containerDescription" TEXT,
    "processDescription" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "source" "RueDataSource" NOT NULL DEFAULT 'MANUAL',
    "sourceReference" TEXT,
    "validatedAt" TIMESTAMP(3),
    "validatedByType" "CoroActorType",
    "validatedById" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RueFacilityContainerSystem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RueEmergencyScenario" (
    "id" TEXT NOT NULL,
    "facilityProfileId" TEXT NOT NULL,
    "facilitySubstanceId" TEXT,
    "nameFR" TEXT NOT NULL,
    "nameEN" TEXT,
    "description" TEXT,
    "type" "RueScenarioType" NOT NULL DEFAULT 'OTHER',
    "eventType" TEXT,
    "releaseDescription" TEXT,
    "potentialEffects" TEXT,
    "impactDistanceKm" DOUBLE PRECISION,
    "impactMethod" TEXT,
    "defaultProtectiveAction" "RueProtectiveAction",
    "publicInstructionFR" TEXT,
    "publicInstructionEN" TEXT,
    "source" "RueDataSource" NOT NULL DEFAULT 'MANUAL',
    "sourceReference" TEXT,
    "validatedAt" TIMESTAMP(3),
    "validatedByType" "CoroActorType",
    "validatedById" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RueEmergencyScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RueEmergencyMeasure" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "phase" "RueEmergencyMeasurePhase" NOT NULL,
    "titleFR" TEXT NOT NULL,
    "titleEN" TEXT,
    "descriptionFR" TEXT,
    "descriptionEN" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "responsiblePosition" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "sourceReference" TEXT,
    "source" "RueDataSource" NOT NULL DEFAULT 'MANUAL',
    "validatedAt" TIMESTAMP(3),
    "validatedByType" "CoroActorType",
    "validatedById" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RueEmergencyMeasure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RueImpactZone" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameFR" TEXT NOT NULL,
    "nameEN" TEXT,
    "description" TEXT,
    "geometry" JSONB,
    "maxDistanceKm" DOUBLE PRECISION,
    "protectiveAction" "RueProtectiveAction",
    "instructionFR" TEXT,
    "instructionEN" TEXT,
    "determinationMethod" TEXT,
    "sourceReference" TEXT,
    "source" "RueDataSource" NOT NULL DEFAULT 'MANUAL',
    "validatedAt" TIMESTAMP(3),
    "validatedByType" "CoroActorType",
    "validatedById" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RueImpactZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RueSurroundingAsset" (
    "id" TEXT NOT NULL,
    "facilityProfileId" TEXT NOT NULL,
    "type" "RueSurroundingAssetType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT,
    "city" TEXT,
    "province" TEXT,
    "postalCode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "geometry" JSONB,
    "estimatedOccupancy" INTEGER,
    "isSensitive" BOOLEAN NOT NULL DEFAULT false,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "publicPhone" TEXT,
    "publicEmail" TEXT,
    "websiteUrl" TEXT,
    "source" "RueDataSource" NOT NULL DEFAULT 'MANUAL',
    "sourceReference" TEXT,
    "validatedAt" TIMESTAMP(3),
    "validatedByType" "CoroActorType",
    "validatedById" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RueSurroundingAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RueSurroundingAssetContact" (
    "id" TEXT NOT NULL,
    "surroundingAssetId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "title" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "roleDescription" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isEmergency" BOOLEAN NOT NULL DEFAULT false,
    "is24x7" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RueSurroundingAssetContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RueLocalAuthority" (
    "id" TEXT NOT NULL,
    "facilityProfileId" TEXT NOT NULL,
    "type" "RueAuthorityType" NOT NULL,
    "name" TEXT NOT NULL,
    "jurisdiction" TEXT,
    "address" TEXT,
    "city" TEXT,
    "province" TEXT,
    "postalCode" TEXT,
    "publicPhone" TEXT,
    "publicEmail" TEXT,
    "websiteUrl" TEXT,
    "roleDescription" TEXT,
    "involvedInPlanDevelopment" BOOLEAN NOT NULL DEFAULT false,
    "publicCommunicationConsulted" BOOLEAN NOT NULL DEFAULT false,
    "planMadeAvailable" BOOLEAN NOT NULL DEFAULT false,
    "planMadeAvailableAt" TIMESTAMP(3),
    "expectedEmergencyResponder" BOOLEAN NOT NULL DEFAULT false,
    "source" "RueDataSource" NOT NULL DEFAULT 'MANUAL',
    "sourceReference" TEXT,
    "validatedAt" TIMESTAMP(3),
    "validatedByType" "CoroActorType",
    "validatedById" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RueLocalAuthority_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RueLocalAuthorityContact" (
    "id" TEXT NOT NULL,
    "localAuthorityId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "title" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "roleDescription" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isAlternate" BOOLEAN NOT NULL DEFAULT false,
    "isEmergency" BOOLEAN NOT NULL DEFAULT false,
    "is24x7" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RueLocalAuthorityContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RueFacilityProfile_buildingId_key" ON "RueFacilityProfile"("buildingId");

-- CreateIndex
CREATE INDEX "RueFacilityProfile_assessmentStatus_idx" ON "RueFacilityProfile"("assessmentStatus");

-- CreateIndex
CREATE INDEX "RueFacilityProfile_populationEnabled_idx" ON "RueFacilityProfile"("populationEnabled");

-- CreateIndex
CREATE INDEX "RueFacilityProfile_pueProjectId_idx" ON "RueFacilityProfile"("pueProjectId");

-- CreateIndex
CREATE UNIQUE INDEX "PopulationProgram_rueFacilityProfileId_key" ON "PopulationProgram"("rueFacilityProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "PopulationProgram_publicSlug_key" ON "PopulationProgram"("publicSlug");

-- CreateIndex
CREATE INDEX "PopulationProgram_status_idx" ON "PopulationProgram"("status");

-- CreateIndex
CREATE INDEX "PopulationProgram_registrationEnabled_idx" ON "PopulationProgram"("registrationEnabled");

-- CreateIndex
CREATE INDEX "PopulationSubscriber_programId_idx" ON "PopulationSubscriber"("programId");

-- CreateIndex
CREATE INDEX "PopulationSubscriber_status_idx" ON "PopulationSubscriber"("status");

-- CreateIndex
CREATE INDEX "PopulationSubscriber_programId_status_idx" ON "PopulationSubscriber"("programId", "status");

-- CreateIndex
CREATE INDEX "PopulationSubscriber_phone_idx" ON "PopulationSubscriber"("phone");

-- CreateIndex
CREATE INDEX "PopulationSubscriber_email_idx" ON "PopulationSubscriber"("email");

-- CreateIndex
CREATE INDEX "PopulationConsentEvent_programId_idx" ON "PopulationConsentEvent"("programId");

-- CreateIndex
CREATE INDEX "PopulationConsentEvent_subscriberId_idx" ON "PopulationConsentEvent"("subscriberId");

-- CreateIndex
CREATE INDEX "PopulationConsentEvent_type_idx" ON "PopulationConsentEvent"("type");

-- CreateIndex
CREATE INDEX "PopulationConsentEvent_occurredAt_idx" ON "PopulationConsentEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "PopulationVerification_subscriberId_idx" ON "PopulationVerification"("subscriberId");

-- CreateIndex
CREATE INDEX "PopulationVerification_expiresAt_idx" ON "PopulationVerification"("expiresAt");

-- CreateIndex
CREATE INDEX "PopulationAlert_programId_idx" ON "PopulationAlert"("programId");

-- CreateIndex
CREATE INDEX "PopulationAlert_incidentEventId_idx" ON "PopulationAlert"("incidentEventId");

-- CreateIndex
CREATE INDEX "PopulationAlert_emergencyScenarioId_idx" ON "PopulationAlert"("emergencyScenarioId");

-- CreateIndex
CREATE INDEX "PopulationAlert_status_idx" ON "PopulationAlert"("status");

-- CreateIndex
CREATE INDEX "PopulationAlert_type_idx" ON "PopulationAlert"("type");

-- CreateIndex
CREATE INDEX "PopulationAlert_createdAt_idx" ON "PopulationAlert"("createdAt");

-- CreateIndex
CREATE INDEX "PopulationAlertZone_alertId_idx" ON "PopulationAlertZone"("alertId");

-- CreateIndex
CREATE INDEX "PopulationAlertZone_impactZoneId_idx" ON "PopulationAlertZone"("impactZoneId");

-- CreateIndex
CREATE UNIQUE INDEX "PopulationAlertZone_alertId_zoneCodeSnapshot_key" ON "PopulationAlertZone"("alertId", "zoneCodeSnapshot");

-- CreateIndex
CREATE UNIQUE INDEX "PopulationAlertDelivery_idempotencyKey_key" ON "PopulationAlertDelivery"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PopulationAlertDelivery_alertId_idx" ON "PopulationAlertDelivery"("alertId");

-- CreateIndex
CREATE INDEX "PopulationAlertDelivery_subscriberId_idx" ON "PopulationAlertDelivery"("subscriberId");

-- CreateIndex
CREATE INDEX "PopulationAlertDelivery_status_idx" ON "PopulationAlertDelivery"("status");

-- CreateIndex
CREATE INDEX "PopulationAlertDelivery_providerMessageId_idx" ON "PopulationAlertDelivery"("providerMessageId");

-- CreateIndex
CREATE INDEX "RueRegulatedSubstance_casNumber_idx" ON "RueRegulatedSubstance"("casNumber");

-- CreateIndex
CREATE INDEX "RueRegulatedSubstance_nameFR_idx" ON "RueRegulatedSubstance"("nameFR");

-- CreateIndex
CREATE INDEX "RueRegulatedSubstance_hazardCategory_idx" ON "RueRegulatedSubstance"("hazardCategory");

-- CreateIndex
CREATE UNIQUE INDEX "RueRegulatedSubstance_schedulePart_scheduleItem_key" ON "RueRegulatedSubstance"("schedulePart", "scheduleItem");

-- CreateIndex
CREATE INDEX "RueFacilitySubstance_facilityProfileId_idx" ON "RueFacilitySubstance"("facilityProfileId");

-- CreateIndex
CREATE INDEX "RueFacilitySubstance_regulatedSubstanceId_idx" ON "RueFacilitySubstance"("regulatedSubstanceId");

-- CreateIndex
CREATE UNIQUE INDEX "RueFacilitySubstance_facilityProfileId_regulatedSubstanceId_key" ON "RueFacilitySubstance"("facilityProfileId", "regulatedSubstanceId");

-- CreateIndex
CREATE INDEX "RueFacilityContainerSystem_facilitySubstanceId_idx" ON "RueFacilityContainerSystem"("facilitySubstanceId");

-- CreateIndex
CREATE INDEX "RueFacilityContainerSystem_isActive_idx" ON "RueFacilityContainerSystem"("isActive");

-- CreateIndex
CREATE INDEX "RueEmergencyScenario_facilityProfileId_idx" ON "RueEmergencyScenario"("facilityProfileId");

-- CreateIndex
CREATE INDEX "RueEmergencyScenario_facilitySubstanceId_idx" ON "RueEmergencyScenario"("facilitySubstanceId");

-- CreateIndex
CREATE INDEX "RueEmergencyScenario_type_idx" ON "RueEmergencyScenario"("type");

-- CreateIndex
CREATE INDEX "RueEmergencyMeasure_scenarioId_idx" ON "RueEmergencyMeasure"("scenarioId");

-- CreateIndex
CREATE INDEX "RueEmergencyMeasure_phase_idx" ON "RueEmergencyMeasure"("phase");

-- CreateIndex
CREATE INDEX "RueEmergencyMeasure_scenarioId_phase_idx" ON "RueEmergencyMeasure"("scenarioId", "phase");

-- CreateIndex
CREATE INDEX "RueImpactZone_scenarioId_idx" ON "RueImpactZone"("scenarioId");

-- CreateIndex
CREATE UNIQUE INDEX "RueImpactZone_scenarioId_code_key" ON "RueImpactZone"("scenarioId", "code");

-- CreateIndex
CREATE INDEX "RueSurroundingAsset_facilityProfileId_idx" ON "RueSurroundingAsset"("facilityProfileId");

-- CreateIndex
CREATE INDEX "RueSurroundingAsset_type_idx" ON "RueSurroundingAsset"("type");

-- CreateIndex
CREATE INDEX "RueSurroundingAsset_isSensitive_idx" ON "RueSurroundingAsset"("isSensitive");

-- CreateIndex
CREATE INDEX "RueSurroundingAssetContact_surroundingAssetId_idx" ON "RueSurroundingAssetContact"("surroundingAssetId");

-- CreateIndex
CREATE INDEX "RueLocalAuthority_facilityProfileId_idx" ON "RueLocalAuthority"("facilityProfileId");

-- CreateIndex
CREATE INDEX "RueLocalAuthority_type_idx" ON "RueLocalAuthority"("type");

-- CreateIndex
CREATE INDEX "RueLocalAuthority_expectedEmergencyResponder_idx" ON "RueLocalAuthority"("expectedEmergencyResponder");

-- CreateIndex
CREATE INDEX "RueLocalAuthorityContact_localAuthorityId_idx" ON "RueLocalAuthorityContact"("localAuthorityId");

-- AddForeignKey
ALTER TABLE "RueFacilityProfile" ADD CONSTRAINT "RueFacilityProfile_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PopulationProgram" ADD CONSTRAINT "PopulationProgram_rueFacilityProfileId_fkey" FOREIGN KEY ("rueFacilityProfileId") REFERENCES "RueFacilityProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PopulationSubscriber" ADD CONSTRAINT "PopulationSubscriber_programId_fkey" FOREIGN KEY ("programId") REFERENCES "PopulationProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PopulationConsentEvent" ADD CONSTRAINT "PopulationConsentEvent_programId_fkey" FOREIGN KEY ("programId") REFERENCES "PopulationProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PopulationConsentEvent" ADD CONSTRAINT "PopulationConsentEvent_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "PopulationSubscriber"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PopulationVerification" ADD CONSTRAINT "PopulationVerification_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "PopulationSubscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PopulationAlert" ADD CONSTRAINT "PopulationAlert_programId_fkey" FOREIGN KEY ("programId") REFERENCES "PopulationProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PopulationAlert" ADD CONSTRAINT "PopulationAlert_incidentEventId_fkey" FOREIGN KEY ("incidentEventId") REFERENCES "IncidentEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PopulationAlert" ADD CONSTRAINT "PopulationAlert_emergencyScenarioId_fkey" FOREIGN KEY ("emergencyScenarioId") REFERENCES "RueEmergencyScenario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PopulationAlertZone" ADD CONSTRAINT "PopulationAlertZone_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "PopulationAlert"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PopulationAlertZone" ADD CONSTRAINT "PopulationAlertZone_impactZoneId_fkey" FOREIGN KEY ("impactZoneId") REFERENCES "RueImpactZone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PopulationAlertDelivery" ADD CONSTRAINT "PopulationAlertDelivery_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "PopulationAlert"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PopulationAlertDelivery" ADD CONSTRAINT "PopulationAlertDelivery_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "PopulationSubscriber"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RueFacilitySubstance" ADD CONSTRAINT "RueFacilitySubstance_facilityProfileId_fkey" FOREIGN KEY ("facilityProfileId") REFERENCES "RueFacilityProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RueFacilitySubstance" ADD CONSTRAINT "RueFacilitySubstance_regulatedSubstanceId_fkey" FOREIGN KEY ("regulatedSubstanceId") REFERENCES "RueRegulatedSubstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RueFacilityContainerSystem" ADD CONSTRAINT "RueFacilityContainerSystem_facilitySubstanceId_fkey" FOREIGN KEY ("facilitySubstanceId") REFERENCES "RueFacilitySubstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RueEmergencyScenario" ADD CONSTRAINT "RueEmergencyScenario_facilityProfileId_fkey" FOREIGN KEY ("facilityProfileId") REFERENCES "RueFacilityProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RueEmergencyScenario" ADD CONSTRAINT "RueEmergencyScenario_facilitySubstanceId_fkey" FOREIGN KEY ("facilitySubstanceId") REFERENCES "RueFacilitySubstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RueEmergencyMeasure" ADD CONSTRAINT "RueEmergencyMeasure_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "RueEmergencyScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RueImpactZone" ADD CONSTRAINT "RueImpactZone_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "RueEmergencyScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RueSurroundingAsset" ADD CONSTRAINT "RueSurroundingAsset_facilityProfileId_fkey" FOREIGN KEY ("facilityProfileId") REFERENCES "RueFacilityProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RueSurroundingAssetContact" ADD CONSTRAINT "RueSurroundingAssetContact_surroundingAssetId_fkey" FOREIGN KEY ("surroundingAssetId") REFERENCES "RueSurroundingAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RueLocalAuthority" ADD CONSTRAINT "RueLocalAuthority_facilityProfileId_fkey" FOREIGN KEY ("facilityProfileId") REFERENCES "RueFacilityProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RueLocalAuthorityContact" ADD CONSTRAINT "RueLocalAuthorityContact_localAuthorityId_fkey" FOREIGN KEY ("localAuthorityId") REFERENCES "RueLocalAuthority"("id") ON DELETE CASCADE ON UPDATE CASCADE;
