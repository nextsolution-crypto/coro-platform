-- Réglage CORO par défaut (toutes les organisations) : chaque type d'activité système
-- reçoit sa liste de tâches globale. Une organisation peut ensuite ajouter, remplacer ou
-- désactiver ces listes dans « Types d'activités ». Les listes absentes sont ignorées.
WITH mapping(code, list_name, display_order) AS (
  VALUES
    ('creation_document', 'Production documentaire', 0),
    ('formation_equipe_urgence', 'Formation mesures d''urgence', 0),
    ('formation_equipe_urgence_exercice', 'Formation mesures d''urgence', 0),
    ('formation_equipe_urgence_exercice', 'Exercice d''évacuation', 1),
    ('formation_travail_chaud', 'Formation mesures d''urgence', 0),
    ('formation_coordonnateur', 'Formation mesures d''urgence', 0),
    ('formation_epi', 'Formation mesures d''urgence', 0),
    ('formation_communication', 'Formation mesures d''urgence', 0),
    ('formation_comportement', 'Formation mesures d''urgence', 0),
    ('formation_locataires', 'Formation mesures d''urgence', 0),
    ('exercice_table', 'Exercice d''évacuation', 0),
    ('exercice_evacuation', 'Exercice d''évacuation', 0)
),
resolved AS (
  SELECT t."id" AS activity_type_id, l."id" AS task_list_id, m.display_order
  FROM mapping m
  JOIN "ActivityType" t ON t."code" = m.code AND t."organizationId" IS NULL AND t."isSystem" = true
  JOIN LATERAL (
    SELECT "id" FROM "TaskList"
    WHERE "name" = m.list_name AND "organizationId" IS NULL AND "isActive" = true
    ORDER BY "createdAt" ASC LIMIT 1
  ) l ON true
),
new_policies AS (
  INSERT INTO "ActivityTypeTaskListPolicy" ("id", "activityTypeId", "organizationId", "mode", "createdAt", "updatedAt")
  SELECT gen_random_uuid()::text, r.activity_type_id, NULL, 'REPLACE', now(), now()
  FROM (SELECT DISTINCT activity_type_id FROM resolved) r
  WHERE NOT EXISTS (
    SELECT 1 FROM "ActivityTypeTaskListPolicy" p
    WHERE p."activityTypeId" = r.activity_type_id AND p."organizationId" IS NULL
  )
  RETURNING "id", "activityTypeId"
)
INSERT INTO "ActivityTypeTaskList" ("id", "policyId", "taskListId", "displayOrder", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p."id", r.task_list_id, r.display_order, true, now(), now()
FROM new_policies p
JOIN resolved r ON r.activity_type_id = p."activityTypeId";
