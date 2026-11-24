-- Lien de destination facultatif pour les notifications in-app (cloche de l'app conseiller).
ALTER TABLE "Notification" ADD COLUMN "link" TEXT;
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- Les alertes « Lacune opérationnelle » étaient répétées toutes les heures, jour et nuit.
-- On marque comme lues celles déjà accumulées (aucune suppression).
UPDATE "Notification" SET "isRead" = true WHERE "type" = 'LACUNE_RESILIENCE' AND "isRead" = false;
