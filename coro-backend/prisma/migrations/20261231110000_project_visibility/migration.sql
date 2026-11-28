-- Visibilité des projets pour les conseillers : OPEN (tous en lecture, défaut) ou RESTRICTED (membres).
ALTER TABLE "Organization" ADD COLUMN "projectVisibility" TEXT NOT NULL DEFAULT 'OPEN';
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_projectVisibility_check" CHECK ("projectVisibility" IN ('OPEN', 'RESTRICTED'));
