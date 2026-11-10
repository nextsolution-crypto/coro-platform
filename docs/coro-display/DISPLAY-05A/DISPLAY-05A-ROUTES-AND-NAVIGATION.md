# Routes et navigation

- Interface : `/display`.
- Agrégat : `GET /organizations/:organizationId/display-manager`.
- Plans : routes existantes `/organizations/:organizationId/buildings/:buildingId/display-plan-publications/*`.
- Import : lien vers `/projects`, mécanisme CORO Documents existant.

Le lien CORO Display apparaît dans « Portefeuille » uniquement si `/users/me` expose `DISPLAY_READ`. La route serveur demeure la protection décisive. Les états chargement, erreur, vide, recherche et filtres sont présents.
