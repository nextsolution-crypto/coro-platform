# CORO Client — clôture de l’acceptation commerciale V1

Date : 2026-10-26  
Périmètre : portail client V1 décrit dans `CLIENT-PORTAL-COMMERCIAL-V1-FINAL.md`.

## Courriels transactionnels — VALIDÉS EN PRODUCTION

Destinataire autorisé : `info@getcoro.io`. Identités et données métier entièrement synthétiques.

| Parcours | Preuve de production | Statut |
| --- | --- | --- |
| Invitation | Brevo a accepté le message et produit un identifiant fournisseur; réception constatée; mot de passe temporaire, MFA et ouverture du tableau de bord QA réussis | VALIDÉ EN PRODUCTION |
| Récupération | Demande anti-énumération, réception, ouverture, nouveau secret accepté; ancienne session révoquée à la requête suivante; ancien secret refusé; nouvelle connexion et MFA réussies | VALIDÉ EN PRODUCTION |
| Magic link | Réception, ouverture, MFA et session réussies; seconde ouverture refusée « lien invalide ou expiré » | VALIDÉ EN PRODUCTION |

Le premier ClientUser créé par erreur (`06213348-afd5-4194-867e-d37d899459a4`) a été désactivé, ses sessions révoquées et ses liens invalidés sans modifier l’identité interne `User` homonyme. La preuve idempotente est le run `40362002143` (PASS). Le compte final isolé (`7a366320-0505-4280-a915-e3e784d22407`) appartenait uniquement à l’organisation, au client et au bâtiment QA réservés; aucune donnée de bâtiment réel n’a été consultée. Sa neutralisation finale est assurée par le workflow `Governed Client Email QA Finalization` et doit être reliée ici à son run réussi.

Provisionnement gouverné : PR #92 et #93, SHA `07d72ee3d9b51da9215710db0cfd45ec230a5b2b`, run `40364440998` PASS.

## Réconciliation des sept réserves

| Réserve | Décision finale V1 |
| --- | --- |
| BOOK-01 — réservation/annulation | VALIDÉE en QA synthétique; incluse seulement lorsque CORO configure l’admissibilité du conseiller |
| AUTH-01 — changement/récupération du mot de passe | VALIDÉE; récupération réelle en production, révocation de session et refus de l’ancien secret démontrés |
| ARCHIVE-POLICY | EXCLUSION V1 : consultation autorisée, mutations/régénérations interdites; aucun workflow de réouverture promis |
| SENT-INV-01 — invitations/communications | EXCLUSION V1 des communications externes; contrôles serveur du pilote conservés; fournisseur simulé distinct des trois courriels d’accès validés |
| SENT-ADV-01 — Sentinelle avancée | VALIDÉE pour le périmètre documenté par PR #72/#73 et rapport d’évacuation peuplé PR #76; aucune alarme ou opération d’urgence réelle incluse |
| MAP-01 | VALIDÉE comme aide facultative : tuiles OSM réelles observées, liste bâtiment comme repli; aucun SLA fournisseur |
| SIGN-01 | Technique de PDF privé et compatibilité historique VALIDÉES; signature fournisseur réelle et valeur juridique EXCLUES de la V1 |

## Autorisation de création client

Le contrôle ciblé a démontré un défaut exploitable : `POST /clients` était accessible à tout `User` interne authentifié et actif. Un `OPERATOR` pouvait donc provoquer la création d’un client, d’un `CLIENT_CORPORATE` et d’une invitation. Le correctif impose `ADMIN` ou `SUPER_ADMIN` avant l’appel du service. L’organisation est toujours dérivée du jeton serveur; le rôle du contact demeure le rôle canonique `CLIENT_CORPORATE`. Les tests prouvent qu’un refus n’appelle pas le service et ne produit donc aucun client, compte, invitation ou notification.

## Conditions et exclusions V1

- Organisations, clients, bâtiments, rôles et affectations explicitement provisionnés par CORO; MFA obligatoire.
- Support via `info@getcoro.io` selon les conditions commerciales approuvées; aucune promesse 24/7 implicite.
- Signature fournisseur réelle, valeur juridique du PDF, communications de population/SMS et opérations d’urgence : exclues.
- Projets archivés : lecture seule; aucune réouverture promise.
- Carte : fonction facultative dépendante d’OpenStreetMap, sans SLA.
- Formats Knowledge sans extracteur : non annoncés comme analysés.

## Verdict

`PRÊT À COMMERCIALISER POUR LE PÉRIMÈTRE V1 DÉCRIT`

Ce verdict ne signifie pas « portail fonctionnel à 100 % ». Il couvre uniquement les fonctions et restrictions ci-dessus, après livraison du correctif de création client, neutralisation finale du compte QA et inspection de la version effectivement déployée.
