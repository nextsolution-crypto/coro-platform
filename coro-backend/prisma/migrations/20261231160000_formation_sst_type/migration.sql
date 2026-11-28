-- Type d'activité CORO : formation SST pour les travaux en bâtiment occupé.
INSERT INTO "ActivityType" ("id", "code", "nameFR", "nameEN", "visualToken", "iconKey", "defaultDurationMinutes", "clientBookableDefault", "isSystem", "displayOrder", "createdAt", "updatedAt") VALUES
  ('coro-activity-type-formation-sst-batiment-occupe', 'formation_sst_batiment_occupe', 'Formation SST – travaux en bâtiment occupé', 'OHS training – work in occupied buildings', 'VIOLET', 'TRAINING', 120, true, true, 95, now(), now())
ON CONFLICT DO NOTHING;

-- Même liste de tâches que les autres formations.
WITH resolved AS (
  SELECT t."id" AS activity_type_id, l."id" AS task_list_id
  FROM "ActivityType" t
  JOIN LATERAL (
    SELECT "id" FROM "TaskList"
    WHERE "name" = 'Formation mesures d''urgence' AND "organizationId" IS NULL AND "isActive" = true
    ORDER BY "createdAt" ASC LIMIT 1
  ) l ON true
  WHERE t."code" = 'formation_sst_batiment_occupe' AND t."organizationId" IS NULL AND t."isSystem" = true
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
