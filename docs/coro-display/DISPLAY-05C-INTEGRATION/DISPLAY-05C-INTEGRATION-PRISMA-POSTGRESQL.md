# Prisma et PostgreSQL

La migration réelle est `20261204010000_display_observation_professional_workflow`, dernière des 182 migrations. Elle est additive : permissions enum, champs professionnels, messages, clés étrangères, index, contraintes de texte, contrôles tenant et append-only. Aucune migration existante n’a été réécrite.

Validation sur PostgreSQL 16 jetable, base `coro_display_05c_integration`, port temporaire `55469` :

- `prisma validate` : PASS;
- `prisma generate` 6.19.3 : PASS;
- 182 migrations depuis zéro : PASS;
- seconde passe `migrate deploy` : aucune migration en attente;
- `migrate status` : schéma à jour;
- tests PostgreSQL Display : 3 suites, 5 tests, PASS.

Les événements et messages sont append-only. Les relations utilisateurs sont limitées à l’organisation et aux comptes actifs. Le verrou optimiste est `lockVersion`. Le conteneur temporaire est supprimé après validation.
