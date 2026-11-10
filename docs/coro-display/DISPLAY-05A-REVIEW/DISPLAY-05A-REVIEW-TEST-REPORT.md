# DISPLAY-05A-REVIEW — Rapport de tests

| Contrôle | Résultat | Preuve / réserve |
|---|---|---|
| Prisma validate/generate | PASS | Schéma et client générés |
| 179 migrations PostgreSQL 16 | PASS | Base jetable, statut à jour |
| Display Manager unitaire | PASS | 4 tests |
| Display/PostgreSQL | PASS | 2 tests manager + cycle complet |
| HTTP/spatial PostgreSQL | PASS | 7 tests, 3 suites |
| DISPLAY-03/04A/04B unitaires | PASS | 47 tests, 10 suites; 1 test PostgreSQL séparé |
| TypeScript backend | PASS | `tsc --noEmit` |
| TypeScript frontend | PASS | `tsc --noEmit` et build Next |
| Contrat frontend | PASS | Navigation, droits, aperçu blob, actions gouvernées |
| ESLint Display frontend | PASS avec avertissement | 0 erreur, image blob `<img>` |
| ESLint services modifiés | PASS partiel | Display PASS; 6 constats historiques dans Auth hors lignes modifiées |
| Build backend | PASS | Nest, heap 8 Go |
| Build frontend | PASS | Next 16.4.2, 75 pages, `/display` statique |
| Suite backend complète | PARTIAL | 292 suites/2 719 tests PASS; 7 échecs d'environnement |
| Relance Knowledge hors sandbox | PARTIAL | 34/35 PASS; `pdftoppm` absent |
| Audit prod backend/frontend | PASS | 0 vulnérabilité des deux côtés |
| Audit complet frontend | RESERVE | 8 modérées, dev-only |
| Audit complet backend | RESERVE | 30 constats, dev-only; correction proposée cassante |
| Scan de secrets du diff | PASS | Aucun motif d'identifiant |
| `git diff --check` | PASS | Aucune erreur d'espace |
| HTTP authentifié | PASS | MFA, portée, 401 et 403 sans mutation |
| Navigateur/responsive | BLOCKED | Connecteur Windows indisponible |

Les échecs initiaux `spawn EPERM` provenaient du bac à sable. Hors bac à sable, le test AWS `credential_process` et cinq scénarios d'extraction réussissent; seul l'outil système `pdftoppm` manque. Aucun appel fournisseur réel n'a été effectué.
