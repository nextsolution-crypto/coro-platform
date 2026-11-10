# DISPLAY-05B — Permissions client

- `DISPLAY_CLIENT_PLAN_READ` : bibliothèque et métadonnées autorisées.
- `DISPLAY_CLIENT_PREVIEW` : octets privés d’une variante autorisée.
- `DISPLAY_CLIENT_LOCATION_READ` : étages, zones et emplacements actifs.
- `DISPLAY_CLIENT_OBSERVATION_SUBMIT` : soumission seulement.
- `DISPLAY_CLIENT_OBSERVATION_READ` : lecture des observations dont l’utilisateur est l’auteur.

La portée bâtiment est l’intersection `buildingIds ∩ displayBuildingIds`. Une liste vide reste vide. `ClientJwtGuard` recharge les permissions canoniques à chaque requête; le JWT ne fait pas autorité pour les droits mutables.
