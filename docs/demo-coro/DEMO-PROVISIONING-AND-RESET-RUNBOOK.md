# Runbook de provisionnement et remise en état

## Commandes

L'outil `ops/demo/demo-coro-fixtures.cjs` expose :

- `dry-run` : transaction en lecture seule;
- `provision` : ajout idempotent sous verrou;
- `verify` : cohérence et isolation;
- `prepare` : remet l'environnement en mode actif/simulé sans réécrire l'historique;
- `reset` : retire uniquement les fixtures enregistrées, ou annule entièrement la transaction si une dépendance les protège.

L'exécution nécessite `CORO_DEMO_FIXTURES_RUN=true`. Le workflow de production fixe devra imposer le SHA et la commande; aucune saisie libre d'organisation ne sera acceptée.

## Garanties

- UUID, nom et courriel canoniques codés en dur et contrôlés avant écriture.
- Refus d'un homonyme `ClientUser`.
- Verrou advisory commun par organisation.
- Registre `DemoFixtureRecord` séparant fixtures et données préexistantes.
- Collision de clé, d'identifiant, de nom ou de relation : échec atomique.
- Résumé assaini sans secret ni adresse complète de personne.
- Aucun reset global du tenant.

## Ordre gouverné futur

Migration et release produit → sauvegarde/restauration vérifiées → dry-run → revue du plan → provision → verify → recette → préparation de présentation. Le reset n'est exécuté qu'après preuve locale sur des données jetables.
