-- Réglages par défaut CORO sans référence à une organisation cliente (noms, fournisseurs, personnes).
-- Seuls les éléments globaux sont renommés ; les tâches déjà créées dans les projets restent inchangées.
UPDATE "TaskTemplate" SET "taskTitle" = 'Mise à jour des plans pour le fournisseur de plans' WHERE "organizationId" IS NULL AND "taskTitle" = 'Mise à jour des plans pour G-Link';
UPDATE "TaskTemplate" SET "taskTitle" = 'Envoi des plans au fournisseur de plans' WHERE "organizationId" IS NULL AND "taskTitle" = 'Envoi des plans à G-Link';
UPDATE "TaskTemplate" SET "taskTitle" = 'Vérification des plans du fournisseur' WHERE "organizationId" IS NULL AND "taskTitle" = 'Vérification des plans G-Link';
UPDATE "TaskTemplate" SET "taskTitle" = 'Déposer les plans du fournisseur dans le Drive' WHERE "organizationId" IS NULL AND "taskTitle" = 'Déposer les plans de G-Link dans le Drive';
UPDATE "TaskTemplate" SET "taskTitle" = 'Valider avec la direction que le mandat est facturé à 100 %' WHERE "organizationId" IS NULL AND "taskTitle" = 'Valider avec Myriam si le mandat est facturé à 100%';
UPDATE "TaskTemplate" SET "taskTitle" = 'Envoi des documents à l''imprimeur pour impression et envoi au client' WHERE "organizationId" IS NULL AND "taskTitle" = 'Envoi des documents à Nouveau Concept pour impression et envoi au client';
UPDATE "TaskTemplate" SET "taskTitle" = 'Mise au propre des plans pour le fournisseur de plans' WHERE "organizationId" IS NULL AND "taskTitle" = 'Mise au propre des plans pour G-Link';
UPDATE "TaskTemplate" SET "taskTitle" = 'Déposer les plans du fournisseur dans le Drive' WHERE "organizationId" IS NULL AND "taskTitle" = 'Déposer les plans G-Link dans OneDrive';
UPDATE "TaskTemplate" SET "taskTitle" = 'Envoi des documents à l''imprimeur' WHERE "organizationId" IS NULL AND "taskTitle" = 'Envoi des documents à Nouveau Concept pour impression';
UPDATE "TaskTemplate" SET "taskTitle" = 'Clôturer le projet chez le fournisseur de plans' WHERE "organizationId" IS NULL AND "taskTitle" = 'Clôturer le projet sur la plateforme G-Link';
UPDATE "TimelogCategory" SET "label" = 'Mise à jour du Drive partagé' WHERE "organizationId" IS NULL AND "key" = 'maj_drive' AND "label" = 'Mise à jour du drive Garda';
UPDATE "TimelogCategory" SET "label" = 'Rencontre hebdomadaire d''équipe' WHERE "organizationId" IS NULL AND "key" = 'rencontre_hebdo_smu' AND "label" = 'Rencontre hebdomadaire SMU';
UPDATE "TimelogCategory" SET "label" = 'Rencontre de suivi de projet avec la direction' WHERE "organizationId" IS NULL AND "key" = 'rencontre_myriam' AND "label" = 'Rencontre de suivi de projet avec Myriam';
