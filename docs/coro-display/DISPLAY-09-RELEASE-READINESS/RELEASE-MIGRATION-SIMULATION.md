# Simulation PostgreSQL 16

Environnement : `postgres:16-alpine`, base jetable sans donnée réelle, image builder locale issue de `5ae7cd21`.

| Étape | Résultat | Durée |
|---|---:|---:|
| Baseline | 176/176 PASS | 11,95 s |
| Upgrade Display | 11/11 PASS; total 187 | 2,37 s |
| Seconde passe | aucune migration en attente | 1,43 s |
| Tables Display | 21 | après upgrade |

Tests PostgreSQL : 18 réussis (spatial, publication, Manager, portail, observations, PDF worker, gateway, scopes, orchestration). Aucun échec. La simulation ne contient pas la volumétrie de production; les verrous restent un contrôle pré-release.
