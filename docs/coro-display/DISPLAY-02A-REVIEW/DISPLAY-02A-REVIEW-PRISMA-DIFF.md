# DISPLAY-02A-REVIEW — Diff Prisma

## Observation

Comparaison : `50d57375b037a5fa40a780d1876b9ab426f1523c..d7c1cedf1e1895335e295356a578a4540c85e092`.

- Diff normal : 99 ajouts, 0 suppression.
- Diff avec espaces de fin de ligne ignorés : 99 ajouts, 0 suppression.
- Diff avec tous les espaces ignorés : mêmes ajouts sémantiques.
- Aucun modèle historique n'a été reformaté ou supprimé.

Le chiffre antérieur d'environ 8 780 ajouts et 8 681 suppressions ne décrit donc pas le commit source final et ne doit pas être utilisé comme preuve.

## Modifications fonctionnelles exhaustives

1. Relations `Organization.buildingFloors`, `buildingZones`, `displayLocations`.
2. Enum `SpatialResourceStatus` : `ACTIVE`, `INACTIVE`, `ARCHIVED`.
3. Enum `DisplayPermission` avec les sept permissions prévues.
4. Tableau `User.displayPermissions`, vide par défaut.
5. Relations `Building.spatialFloors`, `spatialZones`, `displayLocations`.
6. Modèle `BuildingFloor` et ses contraintes/index.
7. Modèle `BuildingZone` et ses contraintes/index.
8. Modèle `DisplayLocation` et ses contraintes/index.
9. Tableau `ClientUser.displayPermissions`, vide par défaut.

`Building.floors Int?` demeure inchangé. Aucun backfill, renommage ou conversion de données n'est introduit.

## Correction

Aucune normalisation globale du schéma n'était nécessaire. Le fichier Prisma n'a pas été modifié durant la revue.

## Risque résiduel

Les tableaux de permissions sont organisationnels. Aucune affectation Display par bâtiment n'est modélisée en 02A; cette portée devra être décidée et gouvernée avant une interface d'attribution ou une exposition portail.
