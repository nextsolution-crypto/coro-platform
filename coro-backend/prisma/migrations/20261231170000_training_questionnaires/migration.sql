-- Questionnaires post-formation (code QR rattaché à une activité de formation).
CREATE TABLE "TrainingQuestionnaire" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "activityTypeCode" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "passingPercent" INTEGER NOT NULL DEFAULT 80,
  "questions" JSONB NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TrainingQuestionnaire_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TrainingQuestionnaire_passingPercent_check" CHECK ("passingPercent" BETWEEN 0 AND 100)
);
CREATE INDEX "TrainingQuestionnaire_organizationId_activityTypeCode_idx" ON "TrainingQuestionnaire"("organizationId", "activityTypeCode");
ALTER TABLE "TrainingQuestionnaire" ADD CONSTRAINT "TrainingQuestionnaire_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Un seul questionnaire actif par type et par organisation (ou par défaut).
CREATE UNIQUE INDEX "TrainingQuestionnaire_org_type_active_key" ON "TrainingQuestionnaire"("organizationId", "activityTypeCode") WHERE "isActive" = true AND "organizationId" IS NOT NULL;
CREATE UNIQUE INDEX "TrainingQuestionnaire_default_type_active_key" ON "TrainingQuestionnaire"("activityTypeCode") WHERE "isActive" = true AND "organizationId" IS NULL;

CREATE TABLE "TrainingQuestionnaireSession" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "projectActivityId" TEXT NOT NULL,
  "buildingId" TEXT,
  "questionnaireId" TEXT,
  "title" TEXT NOT NULL,
  "passingPercent" INTEGER NOT NULL,
  "questions" JSONB NOT NULL,
  "token" TEXT NOT NULL,
  "isOpen" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  CONSTRAINT "TrainingQuestionnaireSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TrainingQuestionnaireSession_projectActivityId_key" ON "TrainingQuestionnaireSession"("projectActivityId");
CREATE UNIQUE INDEX "TrainingQuestionnaireSession_token_key" ON "TrainingQuestionnaireSession"("token");
CREATE INDEX "TrainingQuestionnaireSession_organizationId_buildingId_idx" ON "TrainingQuestionnaireSession"("organizationId", "buildingId");
ALTER TABLE "TrainingQuestionnaireSession" ADD CONSTRAINT "TrainingQuestionnaireSession_projectActivityId_fkey" FOREIGN KEY ("projectActivityId") REFERENCES "ProjectActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "TrainingQuestionnaireResponse" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "participantName" TEXT NOT NULL,
  "answers" JSONB NOT NULL,
  "correctCount" INTEGER NOT NULL,
  "totalCount" INTEGER NOT NULL,
  "percent" INTEGER NOT NULL,
  "passed" BOOLEAN NOT NULL,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainingQuestionnaireResponse_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TrainingQuestionnaireResponse_sessionId_idx" ON "TrainingQuestionnaireResponse"("sessionId");
ALTER TABLE "TrainingQuestionnaireResponse" ADD CONSTRAINT "TrainingQuestionnaireResponse_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TrainingQuestionnaireSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
