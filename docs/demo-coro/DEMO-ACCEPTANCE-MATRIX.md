# Matrice d'acceptation Démo

| Contrôle | Statut | Preuve ou condition |
|---|---|---|
| Cible canonique et projets Prémont | PASS | Workflow lecture seule `41757756703` |
| Préservation des autres worktrees | PASS | Worktree `feature/demo-coro-complete` isolé |
| Manifeste stable | PASS local | Tests Node ciblage/collision |
| Migration depuis zéro | PASS local | PostgreSQL 16, 169 migrations appliquées |
| Upgrade depuis la tête précédente | PASS local | Migration Démo réappliquée sur données synthétiques préexistantes conservées |
| Provisionnement idempotent PostgreSQL | PASS local | 29 registres après 1, 2 et 2 exécutions concurrentes |
| Reprise après échec | PASS local | Collision projet injectée après écritures intermédiaires; transaction annulée, puis reprise réussie |
| Refus autre tenant | PASS intégré local | Identité déplacée temporairement vers tenant QA distinct, aucune écriture Démo admise |
| Communications courriel/SMS | PARTIAL | Transports principaux raccordés; inventaire restant |
| Push/webhook/intégration physique | NOT_VERIFIED | Raccordement à terminer |
| Documents privés ouvrables | NOT_VERIFIED | Fixtures documentaires absentes |
| Indicateurs cohérents | PARTIAL | 3 mandats et 4 saisies de temps présents; calculs API/UI à valider |
| Multirôle et MFA | NOT_VERIFIED | Identités non créées |
| Reset ciblé | PASS local | 29 fixtures retirées, 2 projets Prémont synthétiques préexistants conservés, environnement PAUSED/BLOCK |
| Activités/Planning | PASS données local | 3 activités et 4 tâches, rattachements projet et assignation vérifiés |
| TimeLog/Rendement | PASS données local | 3 mandats et 4 saisies de temps; aucune validation financière officielle fabriquée |
| Chrome 12/12 | NOT_VERIFIED | Aucun onglet CORO contrôlable observé |
| Absence d'impact hors tenant | PASS en lecture seule, NOT_VERIFIED en mutation | Comparaison avant/après requise |

Verdict courant : `DEMO_PARTIAL`. Aucun provisionnement de production n'a été effectué.
