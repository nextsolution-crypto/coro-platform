# SP-OPS-04B — Runbook de provisionnement

## Point d'arrêt

Ce runbook ne doit être exécuté sur un environnement partagé qu'après une
autorisation distincte. Commencer obligatoirement par `DRY_RUN=true`.

## Paramètres requis

Renseigner hors Git, dans la session d'exploitation gouvernée :

- `DATABASE_URL`;
- `ALLOW_POPULATION_CONTROLLED_TEST_SETUP=true`;
- `POPULATION_CONTROLLED_TEST_SETUP_ENVIRONMENT=CORO_DEMO_SP_OPS_04B`;
- `POPULATION_CONTROLLED_TEST_SETUP_ORGANIZATION_ID` (valeur canonique CORO Démo);
- `POPULATION_CONTROLLED_TEST_SETUP_CLIENT_ID`;
- `POPULATION_CONTROLLED_TEST_SETUP_ALLOWED_CLIENT_ID` (même valeur);
- `POPULATION_CONTROLLED_TEST_SETUP_BUILDING_ID` (identifiant géré documenté);
- `POPULATION_CONTROLLED_TEST_SETUP_PUBLIC_SLUG=coro-sp-ops-04b-test`;
- `POPULATION_CONTROLLED_TEST_SETUP_ACTOR_USER_ID` (ADMIN ou SUPER_ADMIN actif
  de CORO Démo);
- `DRY_RUN=true`.

Ne jamais afficher `DATABASE_URL` ni l'environnement complet dans une preuve.

## Exécution

1. Vérifier l'absence de déploiement ou de maintenance concurrente.
2. Exécuter `npm run admin:population-controlled-test-setup` en dry-run.
3. Vérifier les identifiants retournés, `subscriberCount: 0`,
   `CONFIGURING / SANDBOX / DUAL_CONTROL`.
4. Obtenir l'approbation humaine de provisionnement.
5. Passer uniquement `DRY_RUN=false` et exécuter une fois.
6. Réexécuter la même commande pour démontrer l'idempotence : le résultat doit
   être identique et l'audit unique.
7. Vérifier en lecture seule qu'aucun programme existant n'a changé.

## Refus attendus

Toute divergence d'organisation, client, acteur, bâtiment, slug, profil,
scénario, zone ou programme doit interrompre l'opération sans mutation. Une
configuration gérée déjà modifiée n'est jamais réparée automatiquement.

## Désactivation

Le programme reste non opérationnel dès sa création : statut `CONFIGURING`,
mode `SANDBOX`, canaux et inscription désactivés, aucun abonné. L'outil n'offre
aucune commande LIVE. Une éventuelle suppression ou mutation relève d'un
mandat distinct; ne pas supprimer les objets avec ce runbook.
