# Cloisonnement multitenant

Les requêtes imposent simultanément `organizationId`, `clientId`, le périmètre bâtiment et, pour le suivi V1, `submittedByClientUserId`. Les identifiants du corps ne déterminent jamais l’organisation ni l’auteur.

La fixture PostgreSQL 16 crée trois organisations synthétiques. Elle démontre qu’un plan étranger est introuvable, qu’un pair ne voit pas les observations de l’auteur et qu’une substitution d’identifiant ne traverse pas le tenant.

Verdict : **PASS** sur services et PostgreSQL; navigateur : `NOT_VERIFIED`.
