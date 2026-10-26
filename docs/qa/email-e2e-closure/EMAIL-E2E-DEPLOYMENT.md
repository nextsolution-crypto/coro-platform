# CORO Email E2E — rapport de déploiement

## État

`NOT_RUN — PRODUCTION_UNCHANGED`

Ce document est préparé avant autorisation. Il ne constitue pas une preuve de déploiement.

## Stratégie approuvable

1. Vérifier les SHA distants, checks et absence de conflit.
2. Fusionner `#82` dans `main`, puis rebaser la cible GitHub de `#83` sur `main` (sans rebase Git), attendre ses checks et la fusionner. Répéter ce changement de base de PR pour `#84`, puis `#85`. Ne jamais modifier les branches par rebase, auto-merge ou push forcé.
3. Après chaque changement de base, vérifier que le diff reste limité au lot attendu et attendre les checks applicables. Vérifier ensuite que `origin/main` contient tous les commits attendus et relever son SHA final.
4. Ne lancer aucun workflow de production pendant les fusions.
5. Déclencher une seule fois `Validate and Release Production` par `workflow_dispatch` avec le SHA final, l'approbation de production et la confirmation de compatibilité des migrations.
6. Relever les quatre digests immuables construits par le workflow.
7. Contrôler backend, portail, reverse proxy, ressources statiques, CORS, erreurs et boucles de redémarrage sans envoyer de courriel.

## Compatibilité et migrations

- Les PR Email E2E ne modifient pas le schéma Prisma et ne nécessitent aucune migration dédiée.
- Le backend écoute sur `0.0.0.0:3002` hors QA; la restriction `127.0.0.1:3102` est réservée au profil QA explicite.
- `FRONTEND_URL` reste supporté; `CORS_ALLOWED_ORIGINS` est une extension contrôlée.
- Les builds et validations sur push `main` ne publient pas d'image. Les jobs d'images et de production sont limités à `workflow_dispatch`.

## Registre à compléter après autorisation

| Élément | Valeur observée |
|---|---|
| SHA final `main` | NOT_RUN |
| Image backend | NOT_RUN |
| Image frontend | NOT_RUN |
| Image portail client | NOT_RUN |
| Image website | NOT_RUN |
| Horodatage | NOT_RUN |
| Workflow/run GitHub | NOT_RUN |
| Santé post-déploiement | NOT_RUN |

## Retour arrière

Arrêter si un check échoue, si le SHA final diffère, si une migration imprévue apparaît ou si un service devient instable. Le rollback de production exige une autorisation distincte. La procédure privilégiée est la restauration des images immuables précédemment approuvées via le workflow de rollback, suivie des mêmes contrôles de santé. Aucun rollback de données n'est prévu puisqu'aucune migration Email E2E n'est attendue.
