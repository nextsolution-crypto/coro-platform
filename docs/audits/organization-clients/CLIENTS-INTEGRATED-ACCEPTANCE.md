# Acceptation integree de l'ecran Clients

## Candidat

- Branche : `fix/organization-clients-integrity`.
- PR : #135.
- Candidat teste : `b83e5933f9e0688dd0d16e5e68f3327618512277`.
- Environnement : stack QA isole, PostgreSQL 16, backend et interfaces reels, fournisseur de courriel simule, reseau deny-by-default.
- Production : release gouvernee terminee; aucune notification reelle ni mutation metier de recette.

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

`VALIDATED_E2E_DEPLOYED_PRIVATE`

La creation, l'administration et la suspension heritee couvertes par le lot sont acceptees et deployees. Le lecteur d'ecran reel demeure `NOT_VERIFIED`; cette limite n'affecte pas les garanties serveur demontrees.

## Livraison gouvernee du 30 octobre 2026

- PR : [#135](https://github.com/nextsolution-crypto/coro-platform/pull/135), fusionnee.
- Commit produit teste : `b83e5933f9e0688dd0d16e5e68f3327618512277`.
- Commit de raccordement secret/release : `5321d16a1b8ea1041bbbfa142d5be0dd1c81ea49`.
- SHA fusionne et actif : `08d4a0e01cb0c2197cde21106ecd76d0b5d55d66`.
- CI du SHA fusionne : run `41096327743`, `SUCCESS`.
- Gate de capacite : run `41096959636`, `SUCCESS`; etat `HEALTHY`, release prete, marge mesuree de 22 041 403 019 octets au-dessus du besoin calcule.
- Inspection pre-release : run `41096963114`, `PASS/GO`; production initiale `cefdf1e6db37ad79fd511156cca574d083ce7cb4`, migration 162, verrou libre, sauvegarde distante et restauration verifiees, quatre images de rollback disponibles.
- Release : run `41097439169`, `SUCCESS`; reconciliation integree `RECONCILIATION_SUCCEEDED`.
- Inspection post-release : run `41099241216`, `PASS/GO`; migration 163 `20261116010000_client_provisioning_integrity`, aucune migration echouee, cinq services actifs sans redemarrage, PostgreSQL 16 sain et quatre images de rollback disponibles.
- Cle outbox : secret GitHub de l'environnement `production`, cle active de 32 octets en base64 validee sans exposition, identifiant `2026-10-clients-v1`; aucune cle precedente requise lors de la premiere activation.
- Fournisseur : aucun courriel reel emis dans la recette; les preuves fonctionnelles utilisent le fournisseur simule.

### Digests actifs

- Backend : `sha256:28cf9b249dbeb894f8fb1f85304603c2bb5f333c5bf818e473463a175af5a78f`.
- Frontend : `sha256:d7ba82ff5bff6b291094d0db47bcb3ce7102eb2193f53aa54a4a21bf5b36c7e4`.
- Portail client : `sha256:9a3071868114810d72c4a056ddb01e51491455cb169edfa387ff41ea7e01641a`.
- Site public : `sha256:7fe1a77c98c925349b5c540c6f1794c795718c50679814157a8adddd3163a16b`.
