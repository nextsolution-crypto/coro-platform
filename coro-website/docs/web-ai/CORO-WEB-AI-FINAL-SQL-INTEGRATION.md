# CORO WEB-AI-FINAL — Intégration SQL publique

## Autorité préparée

`ops/public-knowledge/provision-readonly-role.sql` crée `coro_public_knowledge_runtime` sans mot de passe embarqué, applique `default_transaction_read_only=on`, des timeouts, et n'accorde `SELECT` que sur :

- `PublicKnowledgeSource`;
- `PublicKnowledgeChunk`;
- `PublicKnowledgeCapability`.

Le script utilise la base courante et ne suppose pas un nom de base. `verify-readonly-role.sql` vérifie la connexion, les paramètres et l'absence d'accès à `ProjectFile`, `Organization` et `Building`.

## Preuve QA

Une vraie connexion PostgreSQL 16 avec le rôle jetable a démontré : lecture seule active, `statement_timeout=10s`, lecture des trois tables publiques, aucun privilège d'écriture et aucun `SELECT` sur les trois tables privées testées. Le backend documentaire a ensuite recherché 38 sources avec cette identité.

## Production

Statut : `À PROVISIONNER / NOT_VERIFIED`. Le secret doit être généré et injecté par le canal de secrets gouverné. Ne jamais utiliser l'identité Prisma principale comme substitut. L'activation documentaire est interdite avant le passage du script de vérification en production.
