# Lot de correction livré — Planning Activités

## Autorité serveur

- L'acteur authentifié et le projet résolu côté serveur gouvernent toutes les opérations.
- `projectAccessWhere` protège les lectures; `mutableProjectAccessWhere` protège create/update/delete/duplicate.
- Les champs modifiables sont sélectionnés explicitement; `expectedUpdatedAt` produit un conflit 409.
- La route Bookings par projet applique aussi la portée projet canonique.

## Agrégation, erreurs et ICS

- `GET /activities/portfolio` remplace la limite de 200 et le fan-out navigateur.
- L'écran distingue chargement, vide et panne, efface les résultats non fiables et offre une reprise.
- L'utilitaire ICS partagé par trois consommateurs valide statut, MIME et structure.

## QA intégrée

- Application organisation ajoutée au bootstrap (3168), readiness et CORS local explicite.
- PostgreSQL 16, 161 migrations, neuf identités, MFA locale, fournisseur simulé, stockage privé, réseau deny-by-default.
- Runner : `qa/global-e2e/src/organization-activities-acceptance.mjs`.

## Validation

- Unitaires ciblés : 69 PASS.
- PostgreSQL : 4/4 PASS.
- TypeScript backend/frontend et builds : PASS.
- Design System portefeuille : 10/10 PASS.
- Chrome authentifié : 12/12, F5, clavier/focus, zoom 200 %, aucune erreur console critique.

## Exclusions

Pas de journal général, messagerie, refonte Planification d'équipe, extension Timelog ni lecteur d'écran réel. La recette n'a produit aucune notification réelle ni mutation métier de production.

## Livraison gouvernée

- Merge : `76e7a3c60b38d005e81be72c631f2b91a33668bf` via PR #126.
- CI main : `40977118674` PASS.
- Release : `40977838218` SUCCESS.
- Production : SHA exact actif, migration 161, PostgreSQL sain, quatre services applicatifs actifs.
- Inspection : `40979105630` PASS/GO.
- Capacité : `40979108332` PASS; 20 073 549 824 octets libres et 367 880 603 octets de marge.
- Rollback : quatre images disponibles; sauvegarde distante et restauration vérifiées.

Les exclusions fonctionnelles et les limites QA précédentes restent applicables.
