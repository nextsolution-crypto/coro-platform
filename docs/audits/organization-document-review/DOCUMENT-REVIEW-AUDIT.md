# Audit et correction — révision et approbation documentaire

## Verdict

**ACCEPTATION SERVEUR QA : PASS. ACCEPTATION INTÉGRÉE NAVIGATEUR : BLOQUÉE / NOT_VERIFIED.**

Le candidat corrige les blocages d'autorisation, d'immutabilité, d'atomicité,
de concurrence, d'audit et de reprise. Il ne doit pas être annoncé « prêt »
tant que la campagne navigateur authentifiée et la CI du HEAD final ne sont pas
terminales.

## Environnement

| Élément | Valeur |
|---|---|
| Branche | `audit/organization-document-review` |
| Baseline | `fbccdd1c2618a42d967188edbb808eda590e35bf` |
| Commit d'audit | `0042940e54152a5dfc76544be34240ab5911731f` |
| PostgreSQL QA | 16, base jetable synthétique, aucune donnée production |
| Migration candidate | `20261113010000_document_review_integrity` (160e) |
| Communications | simulées; aucune notification réelle |
| Production | aucune mutation, fusion ou release |

## Parcours intégré prouvé

Sur PMU, PSI et PCA, les tests créent un projet/document synthétique,
soumettent une version précise, ouvrent la révision, ajoutent une observation
autorisée, font décider un acteur indépendant et relisent la version approuvée.
Le snapshot contient la provenance et l'empreinte exactes. Deux décisions
concurrentes ne créent qu'une version. Une modification après soumission produit
un conflit; après correction et resoumission, une nouvelle décision est requise.

La génération, l'édition et la sauvegarde passent leurs compilations et
régressions, mais leur enchaînement visuel authentifié reste `PARTIAL`.

## Invariants

- isolation organisation/projet et opérateur non affecté : PASS;
- archive en lecture seule et projet désactivé : PASS;
- contenu changé et sauvegarde concurrente : PASS par version/lockVersion/hash;
- idempotence de soumission/décision : PASS;
- intégrité de version approuvée : PASS;
- refus sans effet secondaire : PASS;
- panne fournisseur/reprise : PASS métier via outbox;
- XSS en navigateur : NOT_VERIFIED.

## Limites

L'autorité reste `ADMIN/SUPER_ADMIN` avec séparation auteur/approbateur. Une
affectation nominative, un quorum ou un rejet distinct exigent une décision
métier. PDF final et signature restent séparés et non validés.

La première CI du candidat a expiré après 15 minutes pendant la suite
PostgreSQL globale, sans assertion en échec. Le plafond du job a été porté à
25 minutes sans supprimer, ignorer ni modifier les tests et sans changer les
conditions des jobs d'image ou de production. Le harnais `plan-security` a
également été aligné sur le contrat final : document canonique requis, PDF
simulé terminé, attente de l'outbox et nettoyage des nouvelles relations.
Le scénario HTTP intégré supprime lui aussi outbox et demandes avant les
documents parents; sa recette locale passe (4/4).

## Contrôles de mandat

- `PRODUCTION_MUTATION: NO`
- `MERGE: NO`
- `DEPLOYMENT: NO`
- `REAL_NOTIFICATION: NO`
- `PDF_SIGNATURE_ACCEPTANCE: NO`
