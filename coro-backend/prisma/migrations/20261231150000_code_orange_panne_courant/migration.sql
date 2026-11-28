-- Terme privilégié au Québec : « Panne de courant ».
UPDATE "IncidentCode" SET "description" = 'Panne de courant', "updatedAt" = NOW()
WHERE "code" = 'CODE_ORANGE' AND "description" = 'Panne électrique';
