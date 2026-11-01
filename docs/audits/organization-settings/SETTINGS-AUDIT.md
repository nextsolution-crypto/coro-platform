# Audit intégré de Paramètres CORO

## Baseline et périmètre

- Branche : `audit/organization-settings`.
- SHA audité : `e650085b31f135954a3df31517e68bd7602d1ca9`.
- SHA produit observé : `165b41a0b8ecd6ae1fd18f0b03325bcfc1c8c63b`.
- PostgreSQL QA : 164 migrations, tête `20261117010000_building_governance`.
- Production : observation authentifiée en lecture seule de `/settings`; aucune mutation.

Le périmètre comprend `/settings`, `/profile`, Organisation, Module 1, Membres, Types d’activités, Catégories timelog, Modèles de tâches et Feedback. L’administration complète de plateforme, la facturation, les intégrations fournisseur et le Portail Client sont hors périmètre sauf frontière d’identité.

## Architecture observée

`/settings` est un catalogue de liens filtré côté client. Les protections effectives résident dans les contrôleurs et services backend. Les données de présentation dites « organisation » sont en réalité enregistrées dans chaque ligne `User`, tandis que le modèle Module 1 est enregistré par `organizationId`.

## QA exécutée

- Stack isolé : PostgreSQL 16, backend réel, frontend réel, portail réel, MFA local, fournisseur simulé, réseau deny-by-default.
- API/PostgreSQL : deux organisations, deux ADMIN, un OPERATOR, une identité inactive, sessions révoquées et contrôles inter-tenant.
- Chrome : 390×844, 768×1024, 1440×900 et 2560×1440 × Classic, Glass Light et Glass Dark : 12/12 sans débordement.
- Huit routes Paramètres chargées avec succès sur le frontend réel.
- Panne 503 de la liste des membres exercée.
- Tests de sécurité existants : 22/22 PASS.
- Preuves : `D:\CORO-QA\audits\organization-settings\`.

## Résultat

Les protections de mass assignment, l’isolation inter-tenant des mutations, le refus de création `SUPER_ADMIN`, la désactivation, la révocation immédiate des sessions, la persistance de la révocation après réactivation et l’audit durable sont démontrés.

Le verdict reste `FAIL` pour Paramètres : cinq défauts de sécurité ou d’intégrité et un défaut de résilience sont démontrés. Aucun correctif produit n’est inclus dans cet audit.

## Production observée

La page Paramètres active affiche correctement les sections attendues pour la session autorisée, sans débordement horizontal. Aucune sous-page sensible n’a été ouverte avec extraction de données et aucune action n’a été exécutée.

## Limites

- Lecteur d’écran réel : `NOT_VERIFIED`.
- Fournisseur d’invitation réel : `NOT_VERIFIED` et non autorisé.
- Paiement, abonnement, secret et intégration payante : `NON_APPLICABLE` à cet écran.
- Les tests d’envoi sont limités au fournisseur QA simulé.

## Invariants

`PRODUCT_CODE_CHANGE: NO`
`PRODUCTION_MUTATION: NO`
`PUSH_PR_MERGE: NO`
`APPLICATION_DEPLOYMENT: NO`
`REAL_NOTIFICATION: NO`
`WEB_AI_ACTIVATION: NO`
