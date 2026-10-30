# Acceptation integree de l'ecran Clients

## Candidat

- Branche : `fix/organization-clients-integrity`.
- PR : #135.
- Candidat teste : `b83e5933f9e0688dd0d16e5e68f3327618512277`.
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

- Tests Jest cibles : 51/51 PASS.
- Suite backend : 2348 PASS, 2 ignores; un test OCR local independant du lot reste non execute faute de `pdftoppm` dans le PATH Windows. Les deux smokes OCR/PDF de l'image backend construite sont PASS.
- TypeScript backend et frontend : PASS.
- Migration depuis zero : 163 migrations PASS.
- Mise a niveau depuis la tete precedente : PASS; Client historique conserve.
- Panne SQL forcee dans la transaction : PASS; 0 Client, 0 ClientUser, 0 evenement et 0 requete partiels.
- API/PostgreSQL : refus operateur 403 sans effet; ADMIN autorise; concurrence et perte de reponse rejouees sans doublon; payload incompatible 409; collision explicite; refus inter-organisation; identite revoquee refusee.
- Desactivation : ancienne session et telechargement protege 401; MFA en cours 401; appareil de confiance 401; magic link 401; reset invalide; invitation `CANCELLED` sans appel fournisseur; donnees conservees; reactivation avec nouvelle authentification; compte individuellement desactive toujours refuse; `User` interne homonyme et autre Client inchanges.
- Outbox : premier appel fournisseur simule en 503, reprise durable, une seule livraison, deux tentatives; reprise des baux expires couverte.
- Chrome : 12/12 PASS, soit 390 x 844, 768 x 1024, 1440 x 900 et 2560 x 1440, en Classic, Glass Light et Glass Dark. Pas de debordement horizontal, modale et focus conformes, Escape, F5 et zoom 200 % verifies.
- Lecteur d'ecran reel : `NOT_VERIFIED`.
- Evidences assainies : `D:\CORO-QA\tracking\organization-clients` (hors Git).

## Reconciliation des constats

- CLIENT-001, CLIENT-002, CLIENT-003, CLIENT-004, CLIENT-006 et CLIENT-008 : CORRIGES et verifies.
- CLIENT-005 : CORRIGE dans le perimetre de suspension heritee; sessions et liens existants sont revoques atomiquement.
- CLIENT-007 : CORRIGE; libelle, confirmation et consequences serveur de la desactivation sont coherents.
- CLIENT-009 : NON_BLOQUANT, hors promesse actuelle.

## Politique de desactivation approuvee

La desactivation d'un Client suspend tous ses acces portail a la requete suivante, revoque les sessions, MFA, appareils et liens, et annule les invitations non livrees. Les donnees et historiques sont conserves. La reactivation ne restaure aucune session, aucun lien ou compte individuellement desactive.

Une communication deja acceptee par un fournisseur ne peut pas etre rappelee. Son contenu d'acces demeure toutefois inutilisable parce que l'admissibilite du Client est reverifiee par le serveur.

## Verdict

`ACCEPTATION_INTEGREE_PASS`

La creation, l'administration et la suspension heritee couvertes par le lot sont acceptables sous reserve de la configuration de cle obligatoire avant release. Aucun resultat de ce dossier n'autorise une fusion ou un deploiement.
