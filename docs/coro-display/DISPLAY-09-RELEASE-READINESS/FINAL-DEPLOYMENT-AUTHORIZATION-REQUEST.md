# Demande finale d'autorisation de déploiement — DISPLAY-09

## Candidat et état

- Candidat immuable : `5ae7cd213346169465ee739d09df6d39b26ac6c3`.
- Production observée : `e83d83a1afcb80d9bc95037dadc27700d3f68d89`.
- CI candidat et PR documentaire Draft #262 : PASS; jobs de build/release SKIPPED.
- 11 migrations candidates, 187 migrations totales : simulation PostgreSQL 16 PASS. Aucune migration partagée appliquée.
- Capacité : PASS, environ 28,09 GiB libres à la dernière preuve. Sauvegarde/restauration et autorité de rollback documentées.
- Profil autorisé : `WEB_VIEW_ONLY`; Building Bridge, provenance machine Ops/Incident et urgence Display désactivés.

## Conditions restant à fermer

1. Gate bâtiment : cardinalité canonique égale à un, statut Démo/fictif, autorité Display et emplacement existant, via inventaire fixe READ ONLY.
2. Gate registre : fournir une autorité GHCR organisationnelle limitée, reconstruire depuis le tree candidat exact, pousser les quatre tags `display09-candidate-<SHA>`, relire et consigner les digests distants.
3. Gate DNS/TLS : confirmer dans Cloudflare le CNAME proxifié `display` vers `client.getcoro.io` et la couverture TLS Full (strict), sans encore l'appliquer.

## Intervention suivante proposée

Après fermeture des trois conditions, autoriser séparément une release gouvernée unique : sauvegarde distante et restauration vérifiées; gate capacité; construction/pull par digest; migrations additives; backend puis portails; inspection/réconciliation; smoke tests API, portail et `/d/{publicDisplayId}`; enfin DNS/TLS dans une fenêtre réversible. Conditions d'arrêt : identité ambiguë, digest divergent, migration incompatible, sauvegarde/restauration non démontrée, capacité insuffisante, service malsain, TLS invalide ou toute permission dépassant `WEB_VIEW_ONLY`.

Le rollback doit revenir aux quatre digests compatibles qualifiés, préserver les données et retirer uniquement le hostname Display si le défaut est de routage. Un ancien backend qui ne conserve pas les garanties Display n'est pas un rollback sûr.

**Verdict actuel : GO CONDITIONNEL FINAL-THREE-GATES.** Aucune autorisation de déploiement, DNS, migration, fixture, iPad ou urgence n'est implicitement accordée.
