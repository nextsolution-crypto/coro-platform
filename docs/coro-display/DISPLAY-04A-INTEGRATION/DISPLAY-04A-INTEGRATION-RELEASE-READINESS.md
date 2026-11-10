# DISPLAY-04A-INTEGRATION — Préparation de livraison

Le candidat est local seulement. Prisma, migration additive, worker, rasteriseur, stockage privé, permissions DISPLAY-03 et audit sont cohérents avec `origin/main`. Aucun workflow de déploiement n’a été modifié.

Avant fusion future : CI sur contexte dépôt complet; revue de licence; décision explicite sur la politique de rétention; validation d’une campagne hostile spécialisée pour bombe d’image/OOM. Aucune migration partagée, image publiée ou production modifiée.

Rollback technique : retirer services worker/rasteriseur et revenir au backend antérieur avant toute utilisation des nouveaux jobs; la migration étant additive, les données peuvent rester sans être consommées. La compatibilité doit être revalidée au moment de la release.
