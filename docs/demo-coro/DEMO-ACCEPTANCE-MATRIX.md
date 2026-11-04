# Matrice d'acceptation Démo

| Contrôle | Statut | Preuve ou condition |
|---|---|---|
| Cible canonique et projets Prémont | PASS | Workflow lecture seule `41757756703` |
| Préservation des autres worktrees | PASS | Worktree `feature/demo-coro-complete` isolé |
| Manifeste stable | PASS local | Tests Node ciblage/collision |
| Migration depuis zéro | PASS local | PostgreSQL 16, 169 migrations appliquées |
| Upgrade depuis la tête précédente | PASS local | Migration Démo réappliquée sur données synthétiques préexistantes conservées |
| Provisionnement idempotent PostgreSQL | PASS local | 40 registres après 1, 2 et 2 exécutions concurrentes |
| Reprise après échec | PASS local | Collision projet injectée après écritures intermédiaires; transaction annulée, puis reprise réussie |
| Refus autre tenant | PASS intégré local | Identité déplacée temporairement vers tenant QA distinct, aucune écriture Démo admise |
| Communications courriel/SMS | PARTIAL | Transports principaux raccordés; inventaire restant |
| Push/webhook/intégration physique | NOT_VERIFIED | Raccordement à terminer |
| Documents privés ouvrables | PASS intégré local | Stockage S3 QA isolé, SHA-256 identique, aucun storageKey ni URL HTTP exposé |
| Knowledge et citations | PASS intégré local | Source APPROVED indexée localement, citation/version exacte, retrait après révocation |
| Indicateurs cohérents | PASS intégré local | 11,5 h; ventes CAD 39 800,00; coût 828,00; marge 38 972,00; 3 mandats complets |
| Multirôle et MFA | NOT_VERIFIED | Identités non créées |
| Reset ciblé | PASS local | 40 fixtures retirées, neutralisées ou désactivées; 2 projets Prémont synthétiques préexistants conservés; environnement PAUSED/BLOCK |
| Activités/Planning | PASS données local | 3 activités et 4 tâches, rattachements projet et assignation vérifiés |
| TimeLog/Rendement | PASS données local | 3 mandats et 4 saisies de temps; aucune validation financière officielle fabriquée |
| Sortie de reset par `prepare` | PASS local | Reprovisionne 10 projets puis ACTIVE/SIMULATE, fournisseurs externes toujours désactivés |
| Protection après nouveau reset | PASS local | PAUSED/BLOCK et fournisseurs externes désactivés |
| Sentinelle/Incident/REX | PASS données local | 2 employés, 4 présences, 1 exercice sans jeton public, 2 actions liées |
| Chrome 12/12 | NOT_VERIFIED | Aucun onglet CORO contrôlable observé |
| Absence d'impact hors tenant | PASS en lecture seule, NOT_VERIFIED en mutation | Comparaison avant/après requise |

Verdict courant : `DEMO_PARTIAL`. Aucun provisionnement de production n'a été effectué.
