-- Catégories Timelog par défaut créées en double (deux premiers chargements
-- simultanés : la contrainte unique [key, organizationId] ne bloque pas les NULL).
-- Les saisies référencent la catégorie par sa clé : retirer les doublons est sans effet sur elles.
DELETE FROM "TimelogCategory" t
USING "TimelogCategory" k
WHERE t."organizationId" IS NULL
  AND k."organizationId" IS NULL
  AND t."key" = k."key"
  AND (t."createdAt", t."id") > (k."createdAt", k."id");

-- Une seule catégorie par défaut par clé, désormais garanti par la base.
CREATE UNIQUE INDEX IF NOT EXISTS "TimelogCategory_default_key_unique"
  ON "TimelogCategory" ("key")
  WHERE "organizationId" IS NULL;

-- Libellés en français.
UPDATE "TimelogCategory" SET "label" = 'Lecture des courriels' WHERE "organizationId" IS NULL AND "key" = 'lecture_email' AND "label" = 'Lecture de email';
UPDATE "TimelogCategory" SET "label" = 'Rencontre entre collègues' WHERE "organizationId" IS NULL AND "key" = 'meeting_collegues' AND "label" = 'Meeting entre collègues';
