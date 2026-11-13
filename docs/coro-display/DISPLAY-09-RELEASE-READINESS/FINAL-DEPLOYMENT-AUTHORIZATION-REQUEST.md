# Demande finale d’autorisation de déploiement — DISPLAY-09

## Candidat et état

- Candidat immuable : `5ae7cd213346169465ee739d09df6d39b26ac6c3`.
- Production précédemment observée : `e83d83a1afcb80d9bc95037dadc27700d3f68d89`.
- Quatre images GHCR publiées et vérifiées à distance par le run `43341138318`.
- 11 migrations candidates, simulation PostgreSQL 176→187 PASS; aucune migration partagée appliquée.
- Profil autorisé : `WEB_VIEW_ONLY`; Building Bridge, provenance machine Ops/Incident et urgence Display désactivés.

## Conditions restant à fermer

1. Gate bâtiment : la requête fixe READ ONLY est prête et testée dans la PR #264, mais le run `43339858225` a été refusé avant accès serveur par la protection de l’environnement `production`. Autoriser explicitement la fusion de #264, puis exécuter une fois le workflow depuis une branche admise.
2. Gate DNS/TLS : confirmer dans Cloudflare le CNAME proxifié `display` vers `client.getcoro.io`, l’origine, les règles, les cookies/CSP et la couverture TLS Full (strict), sans encore créer le DNS.

## Autorisation suivante proposée

Après fermeture de ces deux conditions, autoriser séparément une release gouvernée unique : sauvegarde distante et restauration fraîche; gate capacité; pull par les quatre digests qualifiés; migrations additives; backend puis portails; inspection et réconciliation; smoke tests API, portail et `/d/{publicDisplayId}`; enfin DNS/TLS dans une fenêtre réversible. Arrêts obligatoires : identité ambiguë, digest divergent, migration incompatible, restauration non démontrée, capacité insuffisante, service malsain, TLS invalide ou permission dépassant `WEB_VIEW_ONLY`.

Le rollback doit utiliser des digests compatibles qualifiés, préserver les données et retirer uniquement le futur hostname Display si le défaut est de routage. Un ancien backend ne conservant pas les garanties Display n’est pas un rollback sûr.

**Verdict actuel : GO CONDITIONNEL FINAL-THREE-GATES.** Aucune autorisation de déploiement, DNS, migration, fixture, iPad ou urgence n’est implicitement accordée.
