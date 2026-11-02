# Constats réconciliés — liste des incidents

Baseline : `4871f31823682a73bbd3e5af9e1c12ac3bbc52d2`. Candidat produit testé : `1c176c4eb2fe1812ba8ef3fd98132c2a098926fc`.

| ID | Constat audité | Statut | Preuve de clôture |
|---|---|---|---|
| INC-LIST-001 | Troncature silencieuse à 50 | **CLOS** | 137/137 accessibles sur 6 pages, sans omission ni doublon; total explicite. |
| INC-LIST-002 | Contrat surdimensionné | **CLOS** | Projection en liste blanche; marqueurs sensibles absents de la réponse réseau. |
| INC-LIST-003 | `PRE_ALERT`/`CANCELLED` rendus « Résolu » | **CLOS** | Libellés distincts et repli « Statut inconnu ». |
| INC-LIST-004 | Exercice non distingué | **CLOS** | `isExercise` canonique, badges et filtre dédiés. |
| INC-LIST-005 | Contexte et dates insuffisants | **PARTIEL / LIMITE DOCUMENTÉE** | Route par bâtiment et date de survenue explicite; aucun responsable ou sévérité inventé. |
| INC-LIST-006 | Recherche, tri et pagination absents | **CLOS** | Recherche type/procédure, tri stable et pagination serveur combinables. |
| INC-LIST-007 | « En cours » trop étroit | **CLOS** | Ensemble existant `PRE_ALERT`, `ACTIVE`, `CONTAINED`; états terminaux exclus. |
| INC-LIST-008 | Autorités Client/interne distinctes | **INFORMATION — PRÉSERVÉ** | Autorité Client canonique conservée; aucun élargissement interne. |
| INC-LIST-009 | Cibles tactiles trop petites | **CLOS** | 12/12 Chrome; aucune cible mesurée sous 44 px. |

Les nouveaux paramètres sont validés et bornés. Les refus 401/403/404 ne livrent ni liste, ni compteur, ni détail. Aucun fournisseur externe n’a été contacté.

Réserves : lecteur d’écran réel et production authentifiée `NOT_VERIFIED`; responsable/sévérité globale non ajoutés faute d’autorité métier approuvée.
