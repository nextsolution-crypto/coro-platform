# Audit et acceptation intégrée — Planning Activités CORO

## Nature et baseline

`/activities/portfolio` est le planning de `ProjectActivity`, pas un journal général, une messagerie, Timelog ou Planification d'équipe.

- Baseline auditée : `93fedd799f76f8aab963df89017c62508f95a7a4`.
- Audit repris par `7b76bcc5cb802fe4485a3a6f9ee95b62b6321ac9`.
- Branche : `fix/organization-activities-governance`.
- Aucune migration; tête QA 161.

## Contrats finaux

| Surface | Contrat |
|---|---|
| Portefeuille organisation | `GET /activities/portfolio` + `projectAccessWhere(actor)` en une requête. |
| Update/delete/duplicate | Résolution serveur + `mutableProjectAccessWhere(actor)`; archive/inactif refusés. |
| ICS | Résolution canonique puis vérification frontend HTTP/MIME/structure. |
| Portefeuille client interne | Client et projets filtrés par l'acteur complet. |
| Bookings projet | Lecture soumise à `projectAccessWhere(actor)`. |
| Réservation Client Portal | Portée client/bâtiment conservée; fournisseur simulé seulement en QA isolé. |

## Preuves

- Unitaires : 3 suites, 69 tests ciblés PASS.
- PostgreSQL : 4 scénarios PASS, dont 201 projets et refus sans effet secondaire.
- TypeScript backend/frontend, builds et Design System 10/10 : PASS.
- E2E : création conseiller, visibilité client, réservation, doublon 409, visibilité conseiller, report, conflit 409, annulation et refus inter-tenant/hors affectation.
- ICS réel et panne 503 sans fichier.
- Chrome : 12/12, F5, focus, zoom 200 %, aucune erreur console critique.
- Images QA : backend `sha256:a4a13b9b07f595f141c6af331e92933f263819783a6743bab03bd5608d874ffa`; frontend `sha256:ec5fb448b3843a4d1497464840fd384df9cbc072de2df9f4ee5d45dbdbc3fa05`.
- Preuves : `D:\CORO-QA\runs\organization-activities\2026-10-29`.

## Limites et verdict

Lecteur d'écran réel `NOT_VERIFIED`. Le fournisseur de courriel est simulé; aucune garantie d'outbox durable n'est revendiquée.

`ACCEPTATION_INTÉGRÉE_PASS`, sous réserve de la dernière campagne du HEAD publié et de la CI de PR.

`PRODUCTION_MUTATION: NO` · `MERGE: NO` · `APPLICATION_DEPLOYMENT: NO` · `REAL_NOTIFICATION: NO` · `WEB_AI_ACTIVATION: NO`
