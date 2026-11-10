# DISPLAY-03 — Machine à états

Flux nominal : `DRAFT → REVIEW → APPROVED → PUBLISHED`.

- `DRAFT → REVIEW` : auteur avec `DISPLAY_PLAN_CREATE`, variante générée.
- `REVIEW → REVIEW` : réviseur indépendant marque la revue.
- `REVIEW → APPROVED` : approbateur distinct, autorité source et variante revérifiées.
- `APPROVED → PUBLISHED` : publieur; verrou et transaction remplacent l’ancienne publication.
- `PUBLISHED → SUSPENDED → PUBLISHED` : suspension/réactivation gouvernée, avec nouvelle validation d’autorité.
- tout état admissible → `REVOKED` : révocation définitive.
- ancienne publication active → `SUPERSEDED` lors du remplacement.

`REVOKED` et `SUPERSEDED` ne sont jamais réactivables. Les requêtes utilisent un `lockVersion`, un verrou consultatif PostgreSQL et une clé de corrélation idempotente.
