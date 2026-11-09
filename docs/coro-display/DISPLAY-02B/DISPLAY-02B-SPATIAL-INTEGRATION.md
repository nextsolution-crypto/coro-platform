# DISPLAY-02B — Intégration spatiale

## Modèle

`BuildingFloor`, `BuildingZone` et `DisplayLocation` portent tous `organizationId` et `buildingId`. Les clés étrangères composites empêchent de rattacher un étage, une zone ou un emplacement à une autre organisation ou à un autre bâtiment.

## Règles

- Les codes sont uniques dans leur parent canonique.
- Les suppressions sont interdites par l'API; l'archivage logique est utilisé.
- Un parent inactif ou archivé rend ses descendants non modifiables.
- `lockVersion` protège les mutations concurrentes.
- Les coordonnées normalisées et l'orientation sont bornées en SQL.
- Les listes sont paginées, bornées et ordonnées de manière déterministe.

## Intégration existante

Le champ historique `Building.floors` demeure inchangé. Aucune donnée historique n'est convertie ou déduite. La nouvelle hiérarchie constitue l'autorité spatiale de CORO Display uniquement.

## Preuve PostgreSQL

Le scénario réel valide la création, la pagination, la hiérarchie, l'audit, la concurrence, les parents inactifs et les refus inter-bâtiments/inter-organisations.
