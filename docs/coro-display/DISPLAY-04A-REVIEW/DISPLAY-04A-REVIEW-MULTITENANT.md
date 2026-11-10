# DISPLAY-04A-REVIEW — Multitenant et permissions

## Observations

Les permissions Display sont explicites; ADMIN et SUPER_ADMIN n'obtiennent aucun droit implicite. Les accès sont bornés par organisation et liste de bâtiments.

## Preuves et tests

- Lecture d'un job exige `DISPLAY_PLAN_READ` puis filtre `id + organizationId + buildingId`.
- Création exige `DISPLAY_PLAN_CREATE` et une publication DRAFT du même tenant/bâtiment.
- Les relations composites PostgreSQL empêchent une publication/job contradictoire.
- Régression spatiale réelle : ADMIN sans permission refusé, permission sans bâtiment refusée, bâtiment étranger refusé, hiérarchie inter-tenant rejetée par PostgreSQL.
- Test unitaire : un identifiant de job étranger reste introuvable.
- DISPLAY-03 PostgreSQL : cycle d'approbation et séparation des autorités PASS.

## Corrections

La finalisation du job inclut maintenant explicitement organisation, bâtiment et `projectFileId` dans les revérifications.

## Risques résiduels

Le rasteriseur ne connaît volontairement aucun tenant : il traite des octets opaques. L'isolation métier est donc entièrement portée par l'orchestrateur avant et après rasterisation; ces contrôles ne doivent jamais migrer dans le processus non fiable.
