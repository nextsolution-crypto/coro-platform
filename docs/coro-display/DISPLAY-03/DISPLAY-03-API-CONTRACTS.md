# DISPLAY-03 — Contrats API

Préfixe : `/organizations/:organizationId/buildings/:buildingId/display-plan-publications`.

- `POST /` crée un brouillon.
- `GET /` liste de façon paginée et bornée.
- `GET /:id`, `GET /:id/history`, `GET /:id/variant` consultent la ressource autorisée.
- `POST /:id/preview|submit|review|reject|approve|publish|suspend|resume|revoke` exécutent les transitions.
- `GET /player-contract/:locationId` retourne uniquement la publication active autorisée.

Les DTO sont validés avec liste blanche et rejet des champs inconnus. Organisation et bâtiment proviennent du contexte authentifié et des routes, puis sont recoupés avec les relations composites. Les mutations exigent `expectedLockVersion`, `reason` et `requestId`.
