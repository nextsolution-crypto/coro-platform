-- Libellés neutres : « équipe graphique » pour la préparation des plans, « Drive » pour le stockage.
UPDATE "TaskTemplate" SET "taskTitle" = 'Mise à jour des plans pour l''équipe graphique' WHERE "organizationId" IS NULL AND "taskTitle" = 'Mise à jour des plans pour le fournisseur de plans';
UPDATE "TaskTemplate" SET "taskTitle" = 'Envoi des plans à l''équipe graphique' WHERE "organizationId" IS NULL AND "taskTitle" = 'Envoi des plans au fournisseur de plans';
UPDATE "TaskTemplate" SET "taskTitle" = 'Vérification des plans de l''équipe graphique' WHERE "organizationId" IS NULL AND "taskTitle" = 'Vérification des plans du fournisseur';
UPDATE "TaskTemplate" SET "taskTitle" = 'Déposer les plans de l''équipe graphique dans le Drive' WHERE "organizationId" IS NULL AND "taskTitle" = 'Déposer les plans du fournisseur dans le Drive';
UPDATE "TaskTemplate" SET "taskTitle" = 'Mise au propre des plans pour l''équipe graphique' WHERE "organizationId" IS NULL AND "taskTitle" = 'Mise au propre des plans pour le fournisseur de plans';
UPDATE "TaskTemplate" SET "taskTitle" = 'Clôturer le projet avec l''équipe graphique' WHERE "organizationId" IS NULL AND "taskTitle" = 'Clôturer le projet chez le fournisseur de plans';
UPDATE "TaskTemplate" SET "taskTitle" = 'Déposer les fichiers dans le Drive' WHERE "organizationId" IS NULL AND "taskTitle" = 'Déposer les fichiers dans OneDrive';
UPDATE "TaskTemplate" SET "taskTitle" = 'Déposer les fichiers dans le Drive' WHERE "organizationId" IS NULL AND "taskTitle" = 'Déposer les fichiers dans le OneDrive';
