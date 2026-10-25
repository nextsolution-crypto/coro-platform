# Registre des constats — Portail client

Dernière mise à jour : 25 octobre 2026, America/Toronto.

Les statuts autorisés sont : `À INVESTIGUER`, `CONFIRMÉ`, `EN CORRECTION`,
`À VÉRIFIER`, `CLOS`. Un constat n’est clos qu’après validation de la release
active et preuve de recette appropriée.

## CP-001 — Historique des incidents présenté comme vide après échec

- **Fonction/routes :** `/sentinelle/[buildingId]/incidents` et
  `GET /client-portal/incidents/buildings/:buildingId/history`.
- **Rôle observé :** compte de démonstration client Martin Gagnon, Groupe
  Immobilier Prémont.
- **Attendu :** chargement, vide réel, filtre vide, refus, session expirée et
  panne technique sont distincts; reprise manuelle disponible.
- **Observé :** la console contient `Error: Erreur réseau`, mais l’écran affiche
  « Aucun incident enregistré. ».
- **Reproduction :** production privée, Tour Prémont, Sentinelle, second bouton
  « Historique », le 24 octobre 2026.
- **Preuve :** observation navigateur production + revue du code au SHA
  `da13a066b3b4531756bfac2fa5cb3ac61243e10f`.
- **Gravité :** MAJEUR.
- **Risque métier :** décision opérationnelle fondée sur une fausse absence.
- **Fichiers :** page incidents, registre Sentinelle, helper auth et tests.
- **Correction :** machine d’état explicite, erreur typée 401/403, reprise,
  données anciennes signalées, réponses tardives ignorées, libellés distincts.
- **Tests :** 11 comportements incident-history + 5 contrats Sentinelle,
  TypeScript et build portail.
- **Statut :** CLOS.
- **Commit/PR :** `d8dab2a48e6872d23024a717df33e1dca8994d58`, PR #44.
- **Recette post-déploiement :** PASS; le compte reçoit un refus 403 explicite,
  F5 conserve la session, et les libellés des deux historiques sont distincts.

## Constats de sécurité à reconfirmer avant correction

| ID | Constat initial | Gravité | Statut | Preuve nécessaire |
|---|---|---|---|---|
| CP-002 | Les listes projets/bâtiments d’un `CLIENT_MANAGER` n’imposaient pas le `clientId` en plus des bâtiments affectés | BLOQUANT | CLOS | PR #45, CI PostgreSQL synthétique et inspection post-release PASS |
| CP-003 | La lecture directe projet était plus stricte que la liste; alignement explicite requis | BLOQUANT | CLOS | Matrice liste/direct manager PASS; portée corporate préservée; inspection post-release PASS |
| CP-004 | Intelligence agrégeait par organisation sans transmettre le client ni les bâtiments autorisés | BLOQUANT | CLOS | PR #50 + état d'erreur PR #53; API 8/8 et navigateur 16/16 PASS; release `40192799857`, inspection `40193617786` PASS/GO, SHA actif `5d6e370c…` |
| CP-005 | Le refus documentaire chargeait le projet par identifiant puis écrivait statut, commentaire et notifications sans contrôle préalable | BLOQUANT | CLOS | PR #49; contrôle parent/rôle/état avant mutation, transaction/idempotence; release `40118313963` et inspection `40119271708` PASS |
| CP-006 | Commentaires, versions et engagements n’héritaient pas du contrôle canonique du projet; la portée corporate ProjectFile était artificiellement limitée au client d’origine | BLOQUANT | CLOS | PR #47; garde parent avant accès, matrice synthétique PASS; release `40116294651` et inspection `40117291362` PASS |
| CP-007 | `addComment` utilisait l’identifiant `ClientUser` comme `userId` de commentaire, sans provenance d’acteur typée | MAJEUR | CLOS | PR #48; migration additive 153 et contrainte exactement-un-auteur; release `40118313963` et inspection `40119271708` PASS |
| CP-008 | Activités, notifications, carte et réservations pouvaient présenter un faux état vide après une panne API | MAJEUR | CLOS | PR #57; 4/4 états 503 avec message et reprise PASS, navigateur 12/12 PASS; release `40198512542`, inspection `40199449644` PASS/GO |
| CP-009 | Employés et invitations Sentinelle étaient persistés avant l'envoi du courriel; une panne fournisseur laissait une ressource après une réponse 500 | MAJEUR | CLOS | PR #57; 2 tests atomiques + matrice API candidate PASS; release `40198512542`, inspection `40199449644` PASS/GO |

## Limites actionnables actuelles

### LIMITATION — aptitude commerciale globale non établie

- **IMPACT :** CP-004 est clos, mais les parcours non vérifiés de DOC-01 et les
  autres campagnes du registre ne permettent pas un feu vert global.
- **CONDITION DE LEVÉE :** approuver la politique des mutations sur projet
  archivé et exécuter le PDF officiel signé dans une campagne autorisée. La
  reprise après panne de base et Knowledge représentatif sont désormais
  prouvés dans le stack QA synthétique.
- **RESPONSABLE :** équipe technique CORO.
- **STATUT :** compatible avec la préparation d'un pilote encadré sur le
  périmètre prouvé. L'accueil autonome de participants reste conditionné aux
  gates effectifs recensés dans `CLIENT-PORTAL-PILOT-CLOSURE.md`.

### LIMITATION — politique de mutation des projets archivés absente

- **IMPACT :** l'objet, ses versions et sa documentation permanente sont bien
  conservés et cloisonnés, mais une régénération demeure techniquement possible
  après archivage.
- **CONDITION DE LEVÉE :** décider si `ARCHIVED` est strictement en lecture
  seule ou réouvrable, puis tester les actions autorisées/interdites.
- **RESPONSABLE :** autorité produit CORO.
- **STATUT :** exclusion du pilote; non bloquant pour les projets actifs.

### LIMITATION — signature et PDF officiel

- **IMPACT :** aucune preuve de bout en bout du fournisseur réel; cette fonction
  ne peut pas être vendue comme validée.
- **CONDITION DE LEVÉE :** campagne explicitement autorisée avec document,
  signataires et destinataires fictifs, suivie d'une validation fournisseur.
- **RESPONSABLE :** autorité produit et fournisseur de signature.
- **STATUT :** exclusion explicite du pilote actuel.

## Preuves CP-004 à CP-007

Le détail consolidé des défauts reproduits, règles attendues, tests, commits,
releases et limites résiduelles est conservé dans
`CLIENT-PORTAL-CP004-CP007-CLOSURE.md`.

L'inventaire complet des fonctions restantes, les preuves CP-008/009 et les
restrictions du pilote sont conservés dans
`CLIENT-PORTAL-FUNCTIONAL-INVENTORY.md`.

## Preuve de clôture CP-002

- **Correctif livré :** commit fusionné
  `460a3ba8c20aff09c6b6012ff7b2bb54a1969b36`, PR #45.
- **Tests :** 76 tests unitaires ciblés PASS; test PostgreSQL 16 avec deux
  organisations, deux clients dans la même organisation, un autre tenant,
  `CLIENT_MANAGER` et `CLIENT_CORPORATE` PASS dans la CI.
- **Refus démontrés :** projet d’un autre client connu par identifiant, bâtiment
  d’un autre client présent dans une affectation périmée/forgée et projet d’un
  autre tenant; aucune ressource retournée et aucune écriture exécutée.
- **Accès légitimes préservés :** responsable sur son client et ses bâtiments;
  corporate sur les clients de son organisation; aucune portée inter-tenant.
- **Release :** workflow `40113284582` SUCCESS; quatre images immuables.
- **Inspection post-release :** workflow `40114255591` PASS/GO; SHA actif
  `460a3ba8c20aff09c6b6012ff7b2bb54a1969b36`, PostgreSQL 16.15, 152
  migrations, sauvegarde `REMOTE_VERIFIED`, restauration `RESTORE_VERIFIED`,
  quatre images de rollback disponibles, verrou de déploiement libre.

## Preuve de clôture CP-003

- **Règle :** la liste et la lecture directe appliquent le même triplet
  organisation/client/bâtiments pour `CLIENT_MANAGER`.
- **Test :** un identifiant projet connu appartenant à un autre client de la
  même organisation retourne `null`, même si son bâtiment est injecté dans la
  liste d’affectations; la liste ne retourne pas ce projet.
- **Non-régression :** `CLIENT_CORPORATE` conserve la portée organisationnelle
  historique et demeure refusé hors organisation.
