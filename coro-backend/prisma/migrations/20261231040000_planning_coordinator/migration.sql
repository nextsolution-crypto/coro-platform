-- Droit « Coordination planification » délégué par un administrateur.
ALTER TABLE "User" ADD COLUMN "planningCoordinator" BOOLEAN NOT NULL DEFAULT false;
