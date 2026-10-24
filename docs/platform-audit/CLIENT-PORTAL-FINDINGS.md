# Registre des constats — Portail client

Dernière mise à jour : 24 octobre 2026, America/Toronto.

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
| CP-004 | Intelligence agrège par organisation sans transmettre le client ni les bâtiments autorisés | BLOQUANT | CONFIRMÉ — OUVERT | `GET intelligence/overview` transmet uniquement `organizationId`; agrégats synthétiques multi-clients requis |
| CP-005 | Le refus documentaire chargeait le projet par identifiant puis écrivait statut, commentaire et notifications sans contrôle préalable | BLOQUANT | CORRIGÉ LOCAL — CI/E2E À CONFIRMER | Contrôle parent/rôle/état avant mutation, transaction et idempotence; preuve `CLIENT-PORTAL-CP005-DOCUMENT-REFUSAL.md` |
| CP-006 | Commentaires, versions et engagements n’héritaient pas du contrôle canonique du projet; la portée corporate ProjectFile était artificiellement limitée au client d’origine | BLOQUANT | CORRIGÉ LOCAL — CI/E2E À CONFIRMER | Garde parent unique ajoutée avant lectures/écritures; inventaire `CLIENT-PORTAL-CP006-ROUTE-INVENTORY.md`; matrice PostgreSQL requise en CI |
| CP-007 | `addComment` utilisait l’identifiant `ClientUser` comme `userId` de commentaire, sans provenance d’acteur typée | MAJEUR | CORRIGÉ LOCAL — CI/UPGRADE/E2E À CONFIRMER | Migration additive et contrainte exactement-un-auteur; preuve `CLIENT-PORTAL-CP007-ACTOR-PROVENANCE.md` |

## Limites actionnables actuelles

### LIMITATION — CP-004 à CP-007 non clos

- **IMPACT :** aucun feu vert commercial global du portail.
- **CONDITION DE LEVÉE :** traiter séparément Intelligence, refus documentaire,
  ressources annexes et provenance des commentaires.
- **RESPONSABLE :** équipe technique CORO.
- **STATUT :** bloquant pour une ouverture commerciale non limitée.

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
