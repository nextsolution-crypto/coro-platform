-- Réglages CORO par défaut : « Relevé technique » et deux types d'inspection deviennent des
-- activités à part entière (couleur, icône, liste de tâches, planification, réservation client).
INSERT INTO "ActivityType" ("id", "code", "nameFR", "nameEN", "visualToken", "iconKey", "defaultDurationMinutes", "clientBookableDefault", "isSystem", "displayOrder", "createdAt", "updatedAt") VALUES
  ('coro-activity-type-releve-technique', 'releve_technique', 'Relevé technique', 'Technical survey', 'ORANGE', 'FIELD', 180, true, true, 5, now(), now()),
  ('coro-activity-type-inspection-securite', 'inspection_securite_physique', 'Inspection de sécurité physique', 'Physical security inspection', 'ROSE', 'INSPECTION', 180, true, true, 6, now(), now()),
  ('coro-activity-type-inspection-code', 'inspection_code', 'Inspection de code', 'Code inspection', 'AMBER', 'INSPECTION', 180, true, true, 7, now(), now())
ON CONFLICT DO NOTHING;

-- Couleurs : l'orange et l'ambre passent aux visites terrain ; les formations gardent le violet.
UPDATE "ActivityType" SET "visualToken" = 'VIOLET' WHERE "organizationId" IS NULL AND "isSystem" = true AND "code" IN ('formation_travail_chaud', 'formation_comportement');

-- Listes de tâches globales.
INSERT INTO "TaskList" ("id", "name", "description", "category", "documentTypes", "organizationId", "isActive", "isDefault", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, v.name, v.description, 'ACTIVITE', ARRAY[]::text[], NULL, true, true, now(), now()
FROM (VALUES
  ('Relevé technique', 'Tâches pour la visite de relevé technique d''un bâtiment'),
  ('Inspection', 'Tâches pour une inspection sur site et son rapport')
) AS v(name, description)
WHERE NOT EXISTS (SELECT 1 FROM "TaskList" l WHERE l."name" = v.name AND l."organizationId" IS NULL);

INSERT INTO "TaskTemplate" ("id", "taskListId", "categoryName", "taskTitle", "documentTypes", "order", "isActive", "organizationId", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, l."id", t.category, t.title, ARRAY[]::text[], t.ord, true, NULL, now(), now()
FROM (VALUES
  ('Relevé technique', 'PRÉPARATION', 'Prise de contact avec le client', 1),
  ('Relevé technique', 'PRÉPARATION', 'Demander les plans et les documents existants', 2),
  ('Relevé technique', 'PRÉPARATION', 'Confirmer le rendez-vous et l''accès au bâtiment', 3),
  ('Relevé technique', 'PRÉPARATION', 'Préparer la liste de vérification du relevé', 4),
  ('Relevé technique', 'OPÉRATION', 'Relevé technique sur site', 1),
  ('Relevé technique', 'OPÉRATION', 'Photos des équipements, issues et points de rassemblement', 2),
  ('Relevé technique', 'OPÉRATION', 'Téléchargement des médias sur le Drive', 3),
  ('Relevé technique', 'OPÉRATION', 'Compléter le configurateur à partir du relevé', 4),
  ('Relevé technique', 'APPROBATION CLIENT', 'Confirmer au client la date de livraison prévue', 1),
  ('Inspection', 'PRÉPARATION', 'Prise de contact avec le client', 1),
  ('Inspection', 'PRÉPARATION', 'Revue des documents et des inspections antérieures', 2),
  ('Inspection', 'PRÉPARATION', 'Confirmer le rendez-vous et l''accès au bâtiment', 3),
  ('Inspection', 'PRÉPARATION', 'Préparer la grille d''inspection', 4),
  ('Inspection', 'OPÉRATION', 'Inspection sur site', 1),
  ('Inspection', 'OPÉRATION', 'Photos et consignation des constats', 2),
  ('Inspection', 'OPÉRATION', 'Téléchargement des médias sur le Drive', 3),
  ('Inspection', 'OPÉRATION', 'Rédaction du rapport d''inspection', 4),
  ('Inspection', 'OPÉRATION', 'Validation, contrôle qualité', 5),
  ('Inspection', 'APPROBATION CLIENT', 'Envoi du rapport au client format PDF', 1),
  ('Inspection', 'APPROBATION CLIENT', 'Présentation des recommandations au client', 2),
  ('Inspection', 'ADMINISTRATION', 'Demande de facturation', 1)
) AS t(list_name, category, title, ord)
JOIN "TaskList" l ON l."name" = t.list_name AND l."organizationId" IS NULL
WHERE NOT EXISTS (
  SELECT 1 FROM "TaskTemplate" x WHERE x."taskListId" = l."id" AND x."taskTitle" = t.title
);

-- Politiques par défaut : chaque nouveau type reçoit sa liste.
WITH mapping(code, list_name) AS (
  VALUES
    ('releve_technique', 'Relevé technique'),
    ('inspection_securite_physique', 'Inspection'),
    ('inspection_code', 'Inspection')
),
resolved AS (
  SELECT t."id" AS activity_type_id, l."id" AS task_list_id
  FROM mapping m
  JOIN "ActivityType" t ON t."code" = m.code AND t."organizationId" IS NULL AND t."isSystem" = true
  JOIN LATERAL (
    SELECT "id" FROM "TaskList" WHERE "name" = m.list_name AND "organizationId" IS NULL AND "isActive" = true
    ORDER BY "createdAt" ASC LIMIT 1
  ) l ON true
),
new_policies AS (
  INSERT INTO "ActivityTypeTaskListPolicy" ("id", "activityTypeId", "organizationId", "mode", "createdAt", "updatedAt")
  SELECT gen_random_uuid()::text, r.activity_type_id, NULL, 'REPLACE', now(), now()
  FROM resolved r
  WHERE NOT EXISTS (
    SELECT 1 FROM "ActivityTypeTaskListPolicy" p WHERE p."activityTypeId" = r.activity_type_id AND p."organizationId" IS NULL
  )
  RETURNING "id", "activityTypeId"
)
INSERT INTO "ActivityTypeTaskList" ("id", "policyId", "taskListId", "displayOrder", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p."id", r.task_list_id, 0, true, now(), now()
FROM new_policies p JOIN resolved r ON r.activity_type_id = p."activityTypeId";

-- Règle d'organisation : délai de remise du rapport d'inspection.
ALTER TABLE "Organization" ADD COLUMN "inspectionReportDeliveryDays" INTEGER NOT NULL DEFAULT 10;

-- Statut de tâche unique : « termine » (ancien onglet Tâches) devient « fait », comme partout ailleurs.
UPDATE "ProjectTask" SET "status" = 'fait' WHERE "status" = 'termine';
