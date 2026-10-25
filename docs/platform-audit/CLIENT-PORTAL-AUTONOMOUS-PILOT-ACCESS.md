# Accès autonome au pilote client — dossier d’acceptation

Date : 25 octobre 2026

Commit candidat : `20db7604c73bb9a918d5d38cbb1996056c4c91da`

PR produit : `#60`

SHA applicatif déployé : `7fc39433070923ce4ed0f9106e46e8b2cacfb604`

Base : `e4a808cf4f5fb06d11d3803421ac9a04a320b008`

Verdict commercial maintenu : `PILOTE ENCADRÉ`

## Mécanisme d’activation

La variable serveur `CLIENT_PORTAL_RESTRICTED_PILOT_ORGANIZATION_IDS` contient
la liste explicite des organisations admises au pilote restreint. Elle n’est ni
exposée ni modifiable par les comptes clients. Les organisations absentes
conservent leurs droits historiques. Ce contrôle complète les autorisations
tenant, client, bâtiment et ressource existantes; il ne les remplace pas.

## Conditions de clôture

| Condition | Contrôle déployé | Preuve QA et production | Statut |
|---|---|---|---|
| Signature et PDF officiel | Refus serveur de signature, statut, relance et récupération; contrôle après résolution canonique du projet et avant toute signature, tâche PDF, stockage, courriel ou notification | Tests unitaires sans effets; appels directs 403; compteurs inchangés; SHA déployé vérifié | `VALIDÉ_QA_DÉPLOYÉ` |
| Invitations Sentinelle | Refus serveur avant création d’invitation ou appel fournisseur; courriel de PIN neutralisé pour la création locale d’employés | Appel direct 403, invitation inchangée; employé local créé sans livraison externe; SHA déployé vérifié | `VALIDÉ_QA_DÉPLOYÉ` |
| Changement de mot de passe | Secret actuel exigé, politique canonique, verrou transactionnel, révocation des sessions et appareils, expiration des liens, audit append-only | Nouveau secret accepté, ancien refusé, ancien JWT 401, fixture restaurée; migration 154 active | `VALIDÉ_QA_DÉPLOYÉ` |
| Projets archivés | Consultation et versions conservées; commentaires, refus, réservations, signature et génération officielle refusés avant effet | Manager et corporate; appels directs 403; compteurs inchangés; SHA déployé vérifié | `VALIDÉ_QA_DÉPLOYÉ` |

La restriction archive est temporaire. Elle ne vaut pas approbation de la
proposition métier « lecture seule avec réouverture explicite et tracée » et
n’ajoute aucun parcours de réouverture.

## Campagne synthétique

- Stack : `pilot-access`, PostgreSQL 16, 154 migrations, backend et portail
  réels, stockage privé et fournisseur simulés, réseau deny-by-default.
- Organisations : une organisation pilote restreinte et une organisation hors
  pilote; manager et corporate; bâtiment hors périmètre et accès inter-tenant.
- API : `26/26 PASS`, campagne authentifiée complète, y compris absence
  d’effets secondaires, accès légitime hors pilote et restauration du compte
  synthétique.
- Navigateur : `12/12 PASS` sur 1440×900, 1920×1080, 390×844 et 430×932,
  Classic, Glass Light et Glass Dark; F5/session, contrôles désactivés,
  géométrie sans débordement et aucune erreur console critique.
- Preuves :
  `D:\CORO-QA\tracking\client-portal\pilot-access-acceptance.json` et
  `D:\CORO-QA\tracking\client-portal\pilot-access-browser`.
- Aucun courriel, SMS, fournisseur de signature ou opération d’urgence réel.

## Limites et activation

La preuve QA autorise techniquement un accès autonome au périmètre pilote
validé, mais aucun participant n’est créé par ce lot. Avant ouverture, il faut
encore renseigner les participants, responsables, bâtiments, canal de support,
dates et conditions commerciales, puis configurer explicitement les IDs des
organisations pilote dans le processus gouverné.

La release gouvernée `40204714128` est `SUCCESS`. L’inspection post-release
finale `40207069079` est `PASS/GO` et confirme le SHA applicatif ci-dessus, les
154 migrations avec le head
`20261108010000_client_password_change_audit`, une sauvegarde
`REMOTE_VERIFIED`, une restauration `RESTORE_VERIFIED`, quatre images de
rollback disponibles et aucun verrou de déploiement actif. La vérification est
demeurée non destructive : aucune signature ni communication externe n’a été
déclenchée.

Le faux positif initial de l’inspecteur sur le mot public `password` présent
dans le nom de migration a été corrigé séparément par les PR `#61`, `#62` et
`#63`, avec `45/45` tests de sécurité et sans changement applicatif.

## Décision

`ACCÈS_AUTONOME_AU_PILOTE_AUTORISABLE`

Cette décision signifie que les quatre contrôles techniques sont démontrés et
déployés. Elle n’ouvre pas le pilote : aucune organisation ni aucun participant
n’a été activé. L’ouverture exige encore la sélection formelle des
organisations et la configuration gouvernée de leurs identifiants, ainsi que
les champs opérationnels encore marqués « À COMPLÉTER » dans la fiche
d’exploitation. Le verdict commercial reste `PILOTE ENCADRÉ` et ne constitue
pas une validation commerciale générale.
