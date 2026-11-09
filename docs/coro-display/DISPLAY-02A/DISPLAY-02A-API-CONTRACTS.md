# DISPLAY-02A — Contrats API

Préfixe interne authentifié :

`/organizations/:organizationId/buildings/:buildingId/spatial`

## Routes

| Méthode | Route | Permission |
|---|---|---|
| GET | `/floors` | DISPLAY_READ |
| POST | `/floors` | DISPLAY_DEVICE_MANAGE |
| GET | `/floors/:floorId` | DISPLAY_READ |
| PATCH | `/floors/:floorId` | DISPLAY_DEVICE_MANAGE |
| POST | `/floors/:floorId/archive` | DISPLAY_DEVICE_MANAGE |
| GET/POST | `/floors/:floorId/zones` | READ / DEVICE_MANAGE |
| GET/PATCH | `/floors/:floorId/zones/:zoneId` | READ / DEVICE_MANAGE |
| POST | `/floors/:floorId/zones/:zoneId/archive` | DISPLAY_DEVICE_MANAGE |
| GET/POST | `/display-locations` | READ / DEVICE_MANAGE |
| GET/PATCH | `/display-locations/:locationId` | READ / DEVICE_MANAGE |
| POST | `/display-locations/:locationId/archive` | DISPLAY_DEVICE_MANAGE |

## Validation

Les DTO rejettent les champs inattendus (`forbidNonWhitelisted`). Les identifiants tenant/bâtiment ne sont jamais pris du corps. Les codes sont normalisés en majuscules et limités à `A-Z`, chiffres, `_` et `-`. Les modifications et archivages exigent `expectedLockVersion`.

Les listes sont déterministes, limitées au bâtiment et paginées explicitement avec `offset` (défaut 0, maximum 1 000 000) et `limit` (défaut 50, maximum 100). La réponse expose `items`, `total`, `offset` et `limit`; les filtres sont appliqués avant le décompte et la pagination.

## Erreurs

- 400 : validation ou coordonnées incomplètes.
- 403 : tenant ou permission incorrecte.
- 404 : ressource absente du périmètre canonique, y compris tentative d’énumération inter-tenant.
- 409 : conflit d’unicité, ressource archivée/inactive, enfant actif ou version concurrente.

Les mutations et leurs événements d’audit sont dans la même transaction et sous verrou consultatif PostgreSQL par bâtiment.
