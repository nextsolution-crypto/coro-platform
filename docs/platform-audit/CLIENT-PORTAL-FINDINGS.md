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
- **Statut :** À VÉRIFIER.
- **Commit/PR :** à renseigner après publication.
- **Recette post-déploiement :** à exécuter; elle établira aussi le statut HTTP
  exact du compte sans modifier ses permissions.

## Constats de sécurité à reconfirmer avant correction

| ID | Constat initial | Gravité | Statut | Preuve nécessaire |
|---|---|---|---|---|
| CP-002 | Listes projets/bâtiments potentiellement limitées par `organizationId` sans `clientId` systématique | BLOQUANT | À INVESTIGUER | Test deux clients du même prestataire |
| CP-003 | Lecture directe d’un projet potentiellement sans contrôle du client propriétaire | BLOQUANT | À INVESTIGUER | Test direct ID projet client B par client A |
| CP-004 | Intelligence susceptible d’agréger le prestataire plutôt que le client connecté | BLOQUANT | À INVESTIGUER | Agrégats synthétiques multi-clients |
| CP-005 | Refus documentaire susceptible d’écrire avant validation complète de l’acteur | BLOQUANT | À INVESTIGUER | Refus interdit sans écriture ni notification |
| CP-006 | Commentaires, versions, engagements et téléchargements susceptibles de ne pas hériter du scope projet | BLOQUANT | À INVESTIGUER | Matrice directe parent/enfant inter-client |
| CP-007 | Auteur de commentaire ClientUser potentiellement incompatible avec la relation User | MAJEUR | À INVESTIGUER | Test de création et inspection de provenance typée |

## Limites actionnables actuelles

### LIMITATION — statut HTTP exact de CP-001 avant déploiement

- **IMPACT :** la cause serveur du compte (refus, session ou panne) ne peut pas
  encore être affirmée; seule la cause du faux état vide est établie.
- **CONDITION DE LEVÉE :** déployer le rendu typé puis observer le message réel,
  ou obtenir une preuve réseau/log serveur expurgée.
- **RESPONSABLE :** équipe technique CORO.
- **STATUT :** compatible avec la correction; bloquant pour clore CP-001.

### LIMITATION — CP-002 à CP-007 non reconfirmés sur la release actuelle

- **IMPACT :** aucun feu vert commercial global du portail.
- **CONDITION DE LEVÉE :** tests synthétiques positifs/négatifs sur la version
  actuelle, puis corrections ciblées si les défauts sont reproduits.
- **RESPONSABLE :** équipe technique CORO.
- **STATUT :** bloquant pour une ouverture commerciale non limitée.
