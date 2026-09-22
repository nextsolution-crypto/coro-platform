BEGIN;

CREATE TYPE "ActivityTypeVisualToken" AS ENUM ('BLUE', 'CYAN', 'VIOLET', 'SLATE', 'INDIGO', 'NAVY', 'ORANGE', 'GREEN', 'AMBER', 'ROSE', 'NEUTRAL');
CREATE TYPE "ActivityTypeIconKey" AS ENUM ('EXERCISE', 'INSPECTION', 'TRAINING', 'MEETING', 'AUDIT', 'DOCUMENT', 'FIELD', 'OTHER');

CREATE TABLE "ActivityType" (
  "id" TEXT NOT NULL, "organizationId" TEXT, "code" TEXT NOT NULL,
  "nameFR" TEXT NOT NULL, "nameEN" TEXT, "descriptionFR" TEXT, "descriptionEN" TEXT,
  "visualToken" "ActivityTypeVisualToken" NOT NULL DEFAULT 'NEUTRAL', "iconKey" "ActivityTypeIconKey",
  "defaultDurationMinutes" INTEGER, "clientBookableDefault" BOOLEAN NOT NULL DEFAULT false,
  "isSystem" BOOLEAN NOT NULL DEFAULT false, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "displayOrder" INTEGER NOT NULL DEFAULT 0, "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActivityType_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ActivityType_scope_check" CHECK (("isSystem" AND "organizationId" IS NULL) OR (NOT "isSystem" AND "organizationId" IS NOT NULL)),
  CONSTRAINT "ActivityType_code_check" CHECK (length(btrim("code")) > 0),
  CONSTRAINT "ActivityType_code_namespace_check" CHECK (("isSystem" AND "code" NOT LIKE 'custom-%') OR (NOT "isSystem" AND "code" LIKE 'custom-%')),
  CONSTRAINT "ActivityType_duration_check" CHECK ("defaultDurationMinutes" IS NULL OR "defaultDurationMinutes" BETWEEN 1 AND 1440),
  CONSTRAINT "ActivityType_display_order_check" CHECK ("displayOrder" BETWEEN 0 AND 100000)
);
CREATE UNIQUE INDEX "ActivityType_organizationId_code_key" ON "ActivityType"("organizationId", "code");
CREATE UNIQUE INDEX "ActivityType_system_code_key" ON "ActivityType"("code") WHERE "organizationId" IS NULL;
CREATE INDEX "ActivityType_organizationId_isActive_displayOrder_idx" ON "ActivityType"("organizationId", "isActive", "displayOrder", "nameFR", "id");
ALTER TABLE "ActivityType" ADD CONSTRAINT "ActivityType_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectActivity" ADD COLUMN "activityTypeId" TEXT;
CREATE INDEX "ProjectActivity_activityTypeId_idx" ON "ProjectActivity"("activityTypeId");

INSERT INTO "ActivityType" ("id", "code", "nameFR", "visualToken", "iconKey", "defaultDurationMinutes", "isSystem", "displayOrder") VALUES
('coro-activity-type-creation-document', 'creation_document', 'Création ou mise à jour de document (PMU/PSI/PUE/PGC...)', 'SLATE', 'DOCUMENT', NULL, true, 10),
('coro-activity-type-formation-urgence', 'formation_equipe_urgence', 'Formation pour équipe d''urgence', 'VIOLET', 'TRAINING', 180, true, 20),
('coro-activity-type-formation-urgence-exercice', 'formation_equipe_urgence_exercice', 'Formation pour équipe d''urgence + exercice simulé', 'INDIGO', 'EXERCISE', 210, true, 30),
('coro-activity-type-formation-travail-chaud', 'formation_travail_chaud', 'Formation travail à chaud', 'ORANGE', 'TRAINING', 120, true, 40),
('coro-activity-type-formation-coordonnateur', 'formation_coordonnateur', 'Formation aux coordonnateurs d''urgence', 'VIOLET', 'TRAINING', 120, true, 50),
('coro-activity-type-formation-epi', 'formation_epi', 'Formation équipe de première intervention (EPI)', 'ROSE', 'TRAINING', 120, true, 60),
('coro-activity-type-formation-communication', 'formation_communication', 'Formation communication d''urgence', 'CYAN', 'TRAINING', 120, true, 70),
('coro-activity-type-formation-comportement', 'formation_comportement', 'Formation comportement et attitude en situation d''urgence', 'AMBER', 'TRAINING', 120, true, 80),
('coro-activity-type-formation-locataires', 'formation_locataires', 'Formation aux locataires', 'GREEN', 'TRAINING', 60, true, 90),
('coro-activity-type-exercice-table', 'exercice_table', 'Exercice de table', 'BLUE', 'EXERCISE', 120, true, 100),
('coro-activity-type-exercice-evacuation', 'exercice_evacuation', 'Exercice d''évacuation annuel', 'NAVY', 'EXERCISE', 180, true, 110),
('coro-activity-type-autre', 'autre', 'Autre', 'NEUTRAL', 'OTHER', NULL, true, 120);

UPDATE "ProjectActivity" AS activity SET "activityTypeId" = catalog."id"
FROM "ActivityType" AS catalog WHERE catalog."isSystem" = true AND catalog."code" = activity."type";
ALTER TABLE "ProjectActivity" ADD CONSTRAINT "ProjectActivity_activityTypeId_fkey" FOREIGN KEY ("activityTypeId") REFERENCES "ActivityType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
