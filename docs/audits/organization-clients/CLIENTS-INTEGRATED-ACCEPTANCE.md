# Acceptation integree de l'ecran Clients

## Candidat

- Branche : `fix/organization-clients-integrity`.
- PR : #135.
- Environnement : stack QA isole, PostgreSQL 16, backend et interfaces reels, fournisseur de courriel simule, reseau deny-by-default.
- Production : aucune mutation, aucune notification reelle, aucune fusion et aucun deploiement.

## Garanties livrees

- Toutes les mutations Client exigent `ADMIN` ou `SUPER_ADMIN` et l'organisation provient de l'identite serveur.
- Les DTO sont fermes et les champs Prisma ne sont jamais transmis en masse.
- La creation de la fiche Client, du `ClientUser`, de la requete idempotente et de l'intention d'invitation s'effectue dans une transaction PostgreSQL unique.
- L'idempotence est liee a l'organisation, a l'acteur, a l'operation et au hash du payload. Un rejeu identique retourne le resultat engage; une reutilisation avec un autre payload est refusee en 409.
- Les collisions `ClientUser` sont refusees sans reaffectation implicite.
- L'invitation est un evenement durable chiffre au repos, traite apres commit avec bail, reprise des baux expires, tentatives bornees et fournisseur simule en QA.
- Aucun secret temporaire ou destinataire en clair n'est inscrit dans l'evenement ou les journaux applicatifs.

## Preuves QA

- Tests Jest Clients : 28/28 PASS.
- TypeScript backend et frontend : PASS.
- Migration depuis zero : 163 migrations PASS.
- Mise a niveau depuis la tete precedente : PASS; Client historique conserve.
- Panne SQL forcee dans la transaction : PASS; 0 Client, 0 ClientUser, 0 evenement et 0 requete partiels.
- API/PostgreSQL : refus operateur 403 sans effet; ADMIN autorise; concurrence et perte de reponse rejouees sans doublon; payload incompatible 409; collision explicite; refus inter-organisation; identite revoquee refusee.
- Outbox : premier appel fournisseur simule en 503, reprise durable, une seule livraison, deux tentatives; reprise des baux expires couverte.
- Chrome : 12/12 PASS, soit 390 x 844, 768 x 1024, 1440 x 900 et 2560 x 1440, en Classic, Glass Light et Glass Dark. Pas de debordement horizontal, modale et focus conformes, Escape, F5 et zoom 200 % verifies.
- Lecteur d'ecran reel : `NOT_VERIFIED`.
- Evidences assainies : `D:\CORO-QA\tracking\organization-clients` (hors Git).

## Reconciliation des constats

- CLIENT-001, CLIENT-002, CLIENT-003, CLIENT-004, CLIENT-006 et CLIENT-008 : CORRIGES et verifies.
- CLIENT-005 : PARTIEL; le changement de contact existant n'est pas elargi par ce lot et la cascade de desactivation reste a decider.
- CLIENT-007 : libelle corrige; consequences d'acces encore soumises a la decision de desactivation.
- CLIENT-009 : NON_BLOQUANT, hors promesse actuelle.

## Politique de desactivation approuvee

La desactivation d'un Client suspend tous ses acces portail a la requete suivante, revoque les sessions, MFA, appareils et liens, et annule les invitations non livrees. Les donnees et historiques sont conserves. La reactivation ne restaure aucune session, aucun lien ou compte individuellement desactive.

Une communication deja acceptee par un fournisseur ne peut pas etre rappelee. Son contenu d'acces demeure toutefois inutilisable parce que l'admissibilite du Client est reverifiee par le serveur.

## Verdict

`ACCEPTATION_INTEGREE_PASS`

La creation, l'administration et la suspension heritee couvertes par le lot sont acceptables sous reserve de la configuration de cle obligatoire avant release. Aucun resultat de ce dossier n'autorise une fusion ou un deploiement.
