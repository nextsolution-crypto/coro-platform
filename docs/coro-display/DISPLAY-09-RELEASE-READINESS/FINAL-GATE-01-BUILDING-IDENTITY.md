# Gate 1 — identité canonique de Tour Prémont

Revalidation du 2026-11-12, strictement en lecture seule.

## Mécanisme gouverné

- PR d’outillage : [#264](https://github.com/nextsolution-crypto/coro-platform/pull/264), HEAD `5d4afbdd68a39c9b3978c53f123014333f5b746e`.
- Requête fixe : organisation `916f54ec-af22-45e0-99db-a369d9630002`, client `Groupe Immobilier Prémont`, bâtiment `Tour Prémont`, adresse `1200 boulevard Robert-Bourassa`, ville normalisée Montréal.
- Transaction PostgreSQL `READ ONLY`; cardinalité exigée égale à un; aucune donnée personnelle exportée; identifiants bruts réservés à une preuve serveur protégée.
- Tests ciblés : PASS. CI PR #264 : PASS (`43340482954`, `43340482927`).

## Exécution

Le workflow `Production Demo Coro Readiness Inventory` a été déclenché une seule fois (`43339858225`). GitHub a refusé le job avant toute connexion au serveur :

`Branch "ops/display09-final-gates" is not allowed to deploy to production due to environment protection rules.`

Le job de validation a réussi, mais le job d’inventaire protégé n’a pas démarré. Aucune lecture PostgreSQL et aucune mutation n’ont eu lieu. La protection n’a pas été contournée.

## Verdict

**CONDITIONAL — BLOCKED_BY_PRODUCTION_ENVIRONMENT_BRANCH_PROTECTION.** Le tenant, le client et les projets restent confirmés par les preuves antérieures, mais l’identité canonique du bâtiment, son statut démo, son autorité Display et son nombre d’emplacements ne sont pas encore démontrés. Action minimale : revue puis fusion explicite de la PR #264 vers une branche autorisée, ou décision séparée sur la protection d’environnement; ensuite, une exécution unique du workflow READ ONLY.
