# DISPLAY-03 — Contrat du futur Player

Le backend choisit la publication : le Player fournit seulement organisation, bâtiment et emplacement autorisés.

Réponse : `publicationId`, `documentVersion`, `variantVersion`, SHA-256, format, dimensions, langue, orientation, dates de validité, emplacement et repère normalisé/orientation. `downloadPath` pointe vers une route privée qui réévalue les droits et l’autorité.

Aucune réponse n’est produite pour `DRAFT`, `REVIEW`, `APPROVED`, `SUSPENDED`, `REVOKED`, `SUPERSEDED`, source révoquée/remplacée/expirée ou emplacement inactif. DISPLAY-04 devra ajouter identité d’appareil, cache signé, accusés et fonctionnement hors ligne; aucun de ces mécanismes n’est simulé ici.
