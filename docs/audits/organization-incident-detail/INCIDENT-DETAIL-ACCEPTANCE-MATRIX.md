# Matrice d'acceptation — fiche Incident

## API et intégrité

| Contrôle | Statut |
|---|---|
| Lecture autorisée | PASS |
| Refus hors bâtiment | PASS (403) |
| Refus inter-tenant | PASS (404) |
| Refus anonyme | PASS (401) |
| Projection minimale | FAIL |
| Auteur/date détenus par le serveur | FAIL |
| Containment idempotent | FAIL |
| Résolution avec motif et préconditions | FAIL |
| REX avec date serveur | FAIL |
| Ordre déterministe des égalités | FAIL / RISQUE STATIQUE |
| Tests gouvernance/tâches/historique existants | PASS — 28/28 |

## Chrome authentifié

Les 12 combinaisons suivantes ont été exécutées : 390×844, 768×1024, 1440×900 et 2560×1440, chacune en Classic, Glass Light et Glass Dark. Toutes sont `FAIL` au verdict global, avec absence de débordement horizontal.

| Critère commun | Statut |
|---|---|
| Chargement sur snapshot conforme | PASS |
| Exercice explicitement distingué | FAIL |
| Statut/responsable/fraîcheur | FAIL |
| Cibles tactiles 44 px | FAIL |
| Thèmes Glass réellement appliqués | FAIL |
| F5 | PASS |
| Zoom 200 % sans débordement | PASS |
| Focus clavier visible | PASS |
| XSS exécutée dans le DOM React | PASS (aucune exécution) |
| 503 explicite, accessible et récupérable | FAIL |
| Erreur console critique | PASS (aucune) |
| Lecteur d'écran réel | NOT_VERIFIED |

Captures : `D:\CORO-QA\tracking\organization-incident-detail\browser`.

## Fonctions absentes

- Pièce jointe Incident dédiée : NON_APPLICABLE.
- Réouverture : NON_APPLICABLE.
- Création/suppression de tâche depuis la fiche : NON_APPLICABLE.
- Fiche Organisation équivalente : NON_APPLICABLE.
