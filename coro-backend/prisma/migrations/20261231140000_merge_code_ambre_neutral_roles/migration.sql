-- Code Ambre (coupure de courant) fusionné dans Code Orange « Panne électrique » :
-- même réaction à l'annonce radio. Ambre est désactivé, pas supprimé.
UPDATE "IncidentCode" SET "description" = 'Panne électrique', "updatedAt" = NOW()
WHERE "code" = 'CODE_ORANGE';

UPDATE "Procedure" SET "incidentCodeId" = (SELECT "id" FROM "IncidentCode" WHERE "code" = 'CODE_ORANGE')
WHERE "incidentCodeId" = (SELECT "id" FROM "IncidentCode" WHERE "code" = 'CODE_AMBRE')
  AND EXISTS (SELECT 1 FROM "IncidentCode" WHERE "code" = 'CODE_ORANGE');

UPDATE "IncidentCode" SET "isActive" = false, "updatedAt" = NOW()
WHERE "code" = 'CODE_AMBRE';

-- Rôles de bibliothèque non genrés : un seul « Préposé à l'entretien ménager ».
UPDATE "Role" SET "name" = 'Préposé à l''entretien ménager', "description" = 'Préposé à l''entretien ménager.', "updatedAt" = NOW()
WHERE "roleCode" = 'ROLE-PREP-H';

UPDATE "Procedure" SET "roleId" = (SELECT "id" FROM "Role" WHERE "roleCode" = 'ROLE-PREP-H')
WHERE "roleId" = (SELECT "id" FROM "Role" WHERE "roleCode" = 'ROLE-PREP-F')
  AND EXISTS (SELECT 1 FROM "Role" WHERE "roleCode" = 'ROLE-PREP-H');

UPDATE "Role" SET "isActive" = false, "name" = 'Préposé à l''entretien ménager (ancien)', "description" = 'Remplacé par ROLE-PREP-H.', "updatedAt" = NOW()
WHERE "roleCode" = 'ROLE-PREP-F';
