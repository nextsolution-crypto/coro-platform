# DISPLAY-03-REVIEW — Machine à états

Flux nominal : `DRAFT → REVIEW → APPROVED → PUBLISHED`.

Transitions secondaires : `REVIEW → DRAFT` (rejet), `PUBLISHED → SUSPENDED → PUBLISHED`, et révocation vers `REVOKED`. Une nouvelle publication transforme atomiquement l’ancienne `PUBLISHED` en `SUPERSEDED`.

Les mutations exigent statut attendu, `lockVersion`, permission, motif et identifiant idempotent. Un verrou consultatif par emplacement sérialise les publications. L’index partiel `one_published_per_location` fournit une seconde barrière DB.

`REVOKED` et `SUPERSEDED` sont terminaux. La route ne propose aucune réactivation. Une publication suspendue n’est ni sélectionnée ni téléchargeable par le contrat Player.

Réserve : les erreurs d’unicité lors d’une reprise concurrente doivent être traduites en conflit métier uniforme dans DISPLAY-04; l’intégrité DB reste néanmoins préservée.
