# DISPLAY-02A — Modèle spatial

## Autorité canonique

`BuildingFloor` et `BuildingZone` appartiennent au domaine spatial commun. `DisplayLocation` est la première ressource consommatrice propre à Display, mais dépend de cette autorité commune.

### BuildingFloor

Clés : `organizationId`, `buildingId`, `code`. Le niveau numérique est facultatif afin de représenter sous-sols, mezzanines, niveaux techniques et niveaux atypiques. `sortOrder` contrôle seulement l’affichage. `status` vaut ACTIVE, INACTIVE ou ARCHIVED. `lockVersion` porte la concurrence optimiste.

### BuildingZone

Une zone appartient obligatoirement à un étage, au même bâtiment et à la même organisation. La géométrie est facultative et doit être un objet JSON. Une évolution multiétage n’est pas anticipée artificiellement.

### DisplayLocation

Un emplacement appartient à un étage; sa zone est facultative. Code et libellé sont obligatoires. Position, orientation et repère « Vous êtes ici » utilisent des coordonnées normalisées 0..1, sans position d’occupant ni donnée personnelle.

## Intégrité structurelle

- FK `BuildingFloor(buildingId, organizationId)` → `Building(id, organizationId)`.
- FK `BuildingZone(floorId, organizationId, buildingId)` → étage composite.
- FK `DisplayLocation(zoneId, organizationId, buildingId, floorId)` → zone composite.
- Unicité des codes par bâtiment/étage selon la ressource.
- CHECK PostgreSQL sur coordonnées, paires X/Y, orientation, niveau et version.
- Suppression physique interdite par API; archivage uniquement.
- Un étage ne peut être archivé avec une zone ou un emplacement actif; une zone ne peut être archivée avec un emplacement actif.

## Compatibilité

`Building.floors Int?` demeure inchangé. Aucun étage n’est créé automatiquement, aucun module actuel n’est redirigé vers les nouvelles tables et un bâtiment sans configuration spatiale continue de fonctionner.

## Contrats futurs seulement documentés

- `DisplayLocation → DisplayPlanPublication → ProjectFile approuvé`.
- `DisplayDevice → DisplayLocation`.
- `Incident → Building/Floor/Zone → DisplayDevice`.

Ces modèles ne sont pas implémentés dans DISPLAY-02A.
