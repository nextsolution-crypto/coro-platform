# INC-RP-01 — Lot 2 — Contrat API brouillons et versions

## Périmètre

Le Lot 2 fournit le moteur professionnel de rapports autonomes, derrière
`INCIDENT_REPORTS_ENABLED`. Le flag reste désactivé par défaut. Aucun endpoint
client, export PDF, import Reportperfect ou notification n'est inclus.

Base: `/organizations/:organizationId/incident-reports`.

| Méthode | Route | Permission individuelle | Affectation requise |
| --- | --- | --- | --- |
| POST | `/` | `INCIDENT_REPORT_CREATE` | autorité Incident active sur le bâtiment |
| GET | `/` | `INCIDENT_REPORT_READ` | autorité Incident active sur le bâtiment |
| GET | `/:id` | `INCIDENT_REPORT_READ` | bâtiment/incident du rapport |
| PATCH | `/:id` | `INCIDENT_REPORT_EDIT` | bâtiment/incident du rapport |
| POST | `/:id/versions` | `INCIDENT_REPORT_EDIT` | bâtiment/incident du rapport |
| POST | `/:id/submit` | `INCIDENT_REPORT_EDIT` | bâtiment/incident du rapport |
| GET | `/:id/versions` | `INCIDENT_REPORT_READ` | bâtiment/incident du rapport |

Chaque mutation exige une clé d'idempotence UUID. Les mutations de brouillon,
la création d'une version et la soumission exigent aussi `expectedLockVersion`.
Une version soumise est figée par `immutableAt` et par le trigger PostgreSQL
livré au Lot 1.

La liste exige `buildingId`, applique les filtres avant pagination et renvoie
`items`, `page`, `pageSize`, `total` et `totalPages`. `pageSize` est borné à 100.

## Autorité

L'accès ne découle jamais implicitement du rôle ADMIN ou SUPER_ADMIN. Le
serveur exige simultanément : identité active du tenant, bâtiment actif du
tenant, permission individuelle active et affectation Incident active contenant
`INCIDENT_READ`. Les recherches canoniques renvoient 404 en cas de défaut
d'autorité afin de ne pas révéler l'existence inter-tenant.

## Compatibilité des formulaires

La création et les versions référencent une version de modèle `PUBLISHED`.
Le contenu JSON est canonisé, limité à 256 Kio, protégé contre les clés de
prototype et validé contre les `requiredFields` du modèle versionné. Ajouter un
champ personnalisé n'exige donc pas une migration Prisma.
