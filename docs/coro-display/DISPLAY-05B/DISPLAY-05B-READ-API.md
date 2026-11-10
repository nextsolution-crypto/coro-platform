# DISPLAY-05B — API de lecture

- `GET /api/client-portal/display` : tableau de bord et plans autorisés.
- `GET /api/client-portal/display/buildings/:buildingId/locations` : structure spatiale active.
- `GET /api/client-portal/display/plans/:publicationId/preview` : rendu privé, `private, no-store`, vérification SHA-256.
- `GET /api/client-portal/display/observations` : observations de l’auteur connecté.
- `POST /api/client-portal/display/observations` : soumission idempotente avec `requestId`.

Les clés de stockage privées ne sont jamais retournées. Les statuts suspendu, révoqué, brouillon, en revue ou remplacé ne sont pas exposés.
