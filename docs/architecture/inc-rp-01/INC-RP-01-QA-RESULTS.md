# INC-RP-01 — Résultats QA

## Lot 0A

- six livrables de référentiel produits;
- capacités RP actuelles et historiques séparées des inférences;
- champs client extensibles sans migration Prisma;
- sections répétables et enveloppe historique sans perte définies;
- parité exacte RP : `NOT_VERIFIED` en attente d'un artefact client.

## Lot 1 — exécution locale du candidat

| Contrôle | Résultat |
|---|---|
| Prisma format/validate/generate | PASS |
| chaîne de 188 migrations sur PostgreSQL 16 jetable | PASS |
| tête `20261208010000_incident_report_foundations` | PASS |
| contraintes PostgreSQL réelles | 2/2 PASS |
| refus intertenant bâtiment/organisation | PASS |
| immuabilité d'une version figée | PASS |
| contrats schéma, permissions et feature flag | 21/21 PASS |
| build NestJS | PASS |

Le premier lancement Jest parallèle a rencontré `spawn EPERM` dans le bac à
sable Windows. La suite a été rejouée en série, sans modifier les tests, et a
réussi. La CI de la PR reste obligatoire pour confirmer le candidat publié.

La recette navigateur n'appartient pas au Lot 1, qui n'expose aucune interface
et demeure désactivé par défaut.
