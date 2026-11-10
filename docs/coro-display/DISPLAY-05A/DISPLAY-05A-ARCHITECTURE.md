# Architecture

## Réutilisation

- `DisplayPlanPublication`, `DisplayPlanPublicationEvent`, `DisplayLocation`, `BuildingFloor`, `BuildingZone`.
- `ProjectFile` demeure l'autorité documentaire et d'approbation PDF.
- Les transitions sensibles restent servies par `DisplayPlanPublicationService`.
- `SpatialAuthorizationService` demeure la référence pour les contrôles par bâtiment.

## Ajout

`DisplayManagerService` produit une lecture agrégée, filtrée par organisation, utilisateur actif, `DISPLAY_READ` et `displayBuildingIds`. Il ne contient aucune mutation. La page Next `/display` utilise ensuite les routes de mutations existantes.

Il n'y a ni migration, ni table, ni stockage public supplémentaire.
