# DISPLAY-05A-REVIEW — Permissions

## Observations

Le backend relit toujours `displayPermissions` et `displayBuildingIds` depuis PostgreSQL. `ADMIN` et `SUPER_ADMIN` n'accordent aucun droit Display implicite. Les capacités retournées à l'interface sont calculées à partir des permissions persistées; les services de publication refont leurs propres contrôles.

## Tests

Le test PostgreSQL `display-manager.postgres-spec.ts` couvre : absence de `DISPLAY_READ`, lecture seule, contenu sans lecture, audit, plusieurs bâtiments, un seul bâtiment, liste vide, `ADMIN` sans droit et `SUPER_ADMIN` sans droit. Les tests HTTP confirment un `401` sans session et un `403` pour une revue sans permission; le verrou et le nombre de plans restent inchangés.

## Corrections

`AuthService.publicUser` expose désormais `displayPermissions` et `displayBuildingIds` dans la session initiale. La navigation ne dépend plus d'un rechargement ultérieur de `/users/me`.

## Risques résiduels

La matrice UI n'a pas pu être rejouée visuellement. Les décisions de sécurité restent néanmoins côté serveur et sont testées sur PostgreSQL réel.
