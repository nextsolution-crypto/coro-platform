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
| CP-002 | Les listes projets/bâtiments d’un `CLIENT_MANAGER` n’imposaient pas le `clientId` en plus des bâtiments affectés | BLOQUANT | CORRIGÉ LOCAL — CI/E2E À CONFIRMER | Tests rouges puis verts avec deux clients d’une même organisation; test PostgreSQL synthétique ajouté |
| CP-003 | La lecture directe projet était plus stricte que la liste; alignement explicite requis | BLOQUANT | CORRIGÉ LOCAL — CI/E2E À CONFIRMER | Matrice liste/direct manager et non-régression corporate ajoutées |
| CP-004 | Intelligence agrège par organisation sans transmettre le client ni les bâtiments autorisés | BLOQUANT | CONFIRMÉ — OUVERT | `GET intelligence/overview` transmet uniquement `organizationId`; agrégats synthétiques multi-clients requis |
| CP-005 | Le refus documentaire charge le projet par identifiant puis écrit le statut, le commentaire et les notifications sans contrôle préalable du scope client/bâtiment | BLOQUANT | CONFIRMÉ — OUVERT | Refus interdit à tester avec preuve d’absence d’écriture, courriel et notification |
| CP-006 | Commentaires, versions et engagements n’héritent pas du contrôle canonique du projet; fichiers/téléchargements restent à prouver séparément | BLOQUANT | CONFIRMÉ PARTIEL — OUVERT | Les routes enfant appellent des lectures/écritures par `projectId` seul; matrice parent/enfant inter-client requise |
| CP-007 | `addComment` utilise l’identifiant `ClientUser` comme `userId` de commentaire, sans provenance d’acteur typée démontrée | MAJEUR | CONFIRMÉ — OUVERT | Test de création et correction de provenance typée requis |

## Limites actionnables actuelles

### LIMITATION — CP-002 à CP-007 non entièrement clos

- **IMPACT :** aucun feu vert commercial global du portail.
- **CONDITION DE LEVÉE :** publier et recetter CP-002/CP-003, puis traiter
  séparément Intelligence, refus documentaire et ressources annexes.
- **RESPONSABLE :** équipe technique CORO.
- **STATUT :** bloquant pour une ouverture commerciale non limitée.
