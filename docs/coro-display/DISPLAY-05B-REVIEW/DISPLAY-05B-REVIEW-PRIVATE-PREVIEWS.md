# Prévisualisations privées

Chaque lecture réévalue permission, tenant, bâtiment, cycle de la publication, cycle `ProjectFile`, emplacement et étage actifs. Les types autorisés sont PNG, JPEG et WebP; l’empreinte SHA-256 est recalculée avant réponse.

En-têtes : `Cache-Control: private, no-store, max-age=0`, `Pragma: no-cache`, `Vary: Authorization`, `X-Content-Type-Options: nosniff`.

Il n’existe aucune URL publique permanente. Rendu manquant, MIME non autorisé et source révoquée deviennent introuvables; une empreinte incorrecte produit un conflit explicite.
