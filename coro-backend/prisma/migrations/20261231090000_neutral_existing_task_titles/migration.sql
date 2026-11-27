-- Libellés neutres aussi pour les tâches déjà créées dans les projets et pour les copies
-- d'organisation : aucune référence à une organisation, un fournisseur ou une personne réelle.
CREATE TEMP TABLE "_neutral_titles" ("old" TEXT PRIMARY KEY, "new" TEXT NOT NULL);
INSERT INTO "_neutral_titles" ("old", "new") VALUES
  ('Mise à jour des plans pour G-Link', 'Mise à jour des plans pour l''équipe graphique'),
  ('Mise à jour des plans pour le fournisseur de plans', 'Mise à jour des plans pour l''équipe graphique'),
  ('Envoi des plans à G-Link', 'Envoi des plans à l''équipe graphique'),
  ('Envoi des plans au fournisseur de plans', 'Envoi des plans à l''équipe graphique'),
  ('Vérification des plans G-Link', 'Vérification des plans de l''équipe graphique'),
  ('Vérification des plans du fournisseur', 'Vérification des plans de l''équipe graphique'),
  ('Déposer les plans de G-Link dans le Drive', 'Déposer les plans de l''équipe graphique dans le Drive'),
  ('Déposer les plans G-Link dans OneDrive', 'Déposer les plans de l''équipe graphique dans le Drive'),
  ('Déposer les plans du fournisseur dans le Drive', 'Déposer les plans de l''équipe graphique dans le Drive'),
  ('Mise au propre des plans pour G-Link', 'Mise au propre des plans pour l''équipe graphique'),
  ('Mise au propre des plans pour le fournisseur de plans', 'Mise au propre des plans pour l''équipe graphique'),
  ('Clôturer le projet sur la plateforme G-Link', 'Clôturer le projet avec l''équipe graphique'),
  ('Clôturer le projet chez le fournisseur de plans', 'Clôturer le projet avec l''équipe graphique'),
  ('Valider avec Myriam si le mandat est facturé à 100%', 'Valider avec la direction que le mandat est facturé à 100 %'),
  ('Envoi des documents à Nouveau Concept pour impression et envoi au client', 'Envoi des documents à l''imprimeur pour impression et envoi au client'),
  ('Envoi des documents à Nouveau Concept pour impression', 'Envoi des documents à l''imprimeur'),
  ('Déposer les fichiers dans OneDrive', 'Déposer les fichiers dans le Drive'),
  ('Déposer les fichiers dans le OneDrive', 'Déposer les fichiers dans le Drive');

UPDATE "ProjectTask" t SET "taskTitle" = n."new" FROM "_neutral_titles" n WHERE t."taskTitle" = n."old";
UPDATE "TaskTemplate" t SET "taskTitle" = n."new" FROM "_neutral_titles" n WHERE t."taskTitle" = n."old";

-- Restes éventuels (titres modifiés à la main) : remplacements ciblés.
UPDATE "ProjectTask" SET "taskTitle" = REPLACE(REPLACE(REPLACE("taskTitle", 'G-Link', 'l''équipe graphique'), 'Nouveau Concept', 'l''imprimeur'), 'OneDrive', 'Drive')
  WHERE "taskTitle" ~ '(G-Link|Nouveau Concept|OneDrive)';
UPDATE "TaskTemplate" SET "taskTitle" = REPLACE(REPLACE(REPLACE("taskTitle", 'G-Link', 'l''équipe graphique'), 'Nouveau Concept', 'l''imprimeur'), 'OneDrive', 'Drive')
  WHERE "taskTitle" ~ '(G-Link|Nouveau Concept|OneDrive)';
UPDATE "ProjectTask" SET "taskTitle" = REPLACE("taskTitle", 'Myriam', 'la direction') WHERE "taskTitle" LIKE '%Myriam%';
UPDATE "TaskTemplate" SET "taskTitle" = REPLACE("taskTitle", 'Myriam', 'la direction') WHERE "taskTitle" LIKE '%Myriam%';

-- Catégories de temps copiées dans les organisations.
UPDATE "TimelogCategory" SET "label" = 'Mise à jour du Drive partagé' WHERE "key" = 'maj_drive' AND "label" ILIKE '%garda%';
UPDATE "TimelogCategory" SET "label" = 'Rencontre hebdomadaire d''équipe' WHERE "key" = 'rencontre_hebdo_smu' AND "label" ILIKE '%SMU%';
UPDATE "TimelogCategory" SET "label" = 'Rencontre de suivi de projet avec la direction' WHERE "key" = 'rencontre_myriam' AND "label" ILIKE '%Myriam%';

-- Noms de listes de tâches.
UPDATE "TaskList" SET "name" = REPLACE(REPLACE(REPLACE("name", 'G-Link', 'équipe graphique'), 'Nouveau Concept', 'imprimeur'), 'OneDrive', 'Drive')
  WHERE "name" ~ '(G-Link|Nouveau Concept|OneDrive)';

DROP TABLE "_neutral_titles";
