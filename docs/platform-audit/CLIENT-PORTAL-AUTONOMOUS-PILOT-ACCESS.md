# Accès autonome au pilote client — dossier d’acceptation

Date : 25 octobre 2026

Branche candidate : `security/client-portal-autonomous-pilot`

Base : `e4a808cf4f5fb06d11d3803421ac9a04a320b008`

Verdict commercial maintenu : `PILOTE ENCADRÉ`

## Mécanisme d’activation

La variable serveur `CLIENT_PORTAL_RESTRICTED_PILOT_ORGANIZATION_IDS` contient
la liste explicite des organisations admises au pilote restreint. Elle n’est ni
exposée ni modifiable par les comptes clients. Les organisations absentes
conservent leurs droits historiques. Ce contrôle complète les autorisations
tenant, client, bâtiment et ressource existantes; il ne les remplace pas.

## Conditions de clôture

| Condition | Contrôle candidat | Preuve QA | Statut avant release |
|---|---|---|---|
| Signature et PDF officiel | Refus serveur de signature, statut, relance et récupération; contrôle après résolution canonique du projet et avant toute signature, tâche PDF, stockage, courriel ou notification | Tests unitaires sans effets; appels directs 403; compteurs inchangés | `VALIDÉ_QA` |
| Invitations Sentinelle | Refus serveur avant création d’invitation ou appel fournisseur; courriel de PIN neutralisé pour la création locale d’employés | Appel direct 403, invitation inchangée; employé local créé sans livraison externe | `VALIDÉ_QA` |
| Changement de mot de passe | Secret actuel exigé, politique canonique, verrou transactionnel, révocation des sessions et appareils, expiration des liens, audit append-only | Nouveau secret accepté, ancien refusé, ancien JWT 401, fixture restaurée | `VALIDÉ_QA` |
| Projets archivés | Consultation et versions conservées; commentaires, refus, réservations, signature et génération officielle refusés avant effet | Manager et corporate; appels directs 403; compteurs inchangés | `VALIDÉ_QA` |

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

La release et l’inspection production doivent encore confirmer le SHA actif,
la migration, la santé, le rollback et la présence de la configuration prévue.
La vérification production demeure non destructive : aucune signature ni
communication externe n’est déclenchée.
