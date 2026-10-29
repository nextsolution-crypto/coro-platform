# Audit ciblé — Activités organisation et parcours conseiller ↔ client

## Périmètre et baseline

- Branche : `audit/organization-activities`
- SHA audité : `93fedd799f76f8aab963df89017c62508f95a7a4`
- `origin/main` au démarrage : même SHA
- Production rapportée et réconciliée avant ce lot : même SHA, migration 161
- Audit en lecture seule du produit; seuls ce dossier documentaire et un runner QA ont été ajoutés.

## Cartographie

| Surface | Route/API | Autorité |
|---|---|---|
| Organisation | `/activities/portfolio` | Page frontend; `/clients`, `/projects?limit=200`, puis `/projects/:id/activities` |
| Projet organisation | `/projects/:id/activities` | `ActivitiesService.getActivities` + `projectAccessWhere` |
| Mutations organisation | `PUT/DELETE /activities/:id`, duplication | Organisation seulement dans le candidat audité (défaut) |
| Calendrier | `GET /activities/:id/ics` | Organisation seulement dans le candidat audité (défaut) |
| Portefeuille client interne | `GET /clients/:id/activities/portfolio` | Organisation + client, sans affectation OPERATOR (défaut) |
| Client Portal | `/activities`, `GET /client-portal/activities` | Organisation + client + bâtiments manager + `clientVisible` |
| Réservation client | `POST /client-portal/activities/:id/bookings` | Projet/client/bâtiment + visibilité/réservabilité + disponibilité conseiller |
| Annulation client | `PUT /client-portal/bookings/:id/cancel` | ClientUser propriétaire + organisation + projet accessible + transaction/audit |

## Modèles et provenance

`ProjectActivity` est l'autorité de planification. `Booking`, `BookingCommitmentVersion` et `BookingAssignment` portent la demande et l'affectation. `AuditLog` accepte `User` ou `ClientUser` selon l'acteur. Les notifications de réservation existent, mais la preuve complète d'outbox traitée/reprise/déduplication n'a pas été obtenue dans ce lot.

## QA exécutée

- Runner reproductible : `qa/global-e2e/src/organization-activities-audit.mjs`.
- Inspection statique ciblée des contrats frontend/backend.
- Relecture des tests unitaires Activités, Bookings et autorisations annexes.
- Tentative d'utilisation du bootstrap permanent : Docker inaccessible sans élévation dans la session et, surtout, le script ne démarre pas le frontend organisation. Aucun résultat navigateur n'est donc revendiqué.
- Les dépendances locales du worktree n'étaient pas installées; aucune suite Jest n'est déclarée exécutée dans ce worktree.

## Résultat

Le parcours Client Portal est mieux gouverné que l'écran organisation. Les lectures projet organisation utilisent la politique canonique, mais les mutations, l'ICS et l'endpoint portefeuille présentent une rupture de symétrie d'autorisation. Les agrégats peuvent être incomplets et les erreurs partielles sont silencieuses.

Verdict : **CORRECTION_REQUISE_AVANT_USAGE**.

## Limites actionnables

### LIMITATION — navigateur organisation
**Impact :** responsive, thèmes, clavier, focus et erreurs réelles non prouvés.
**Condition de levée :** publier le frontend organisation dans le harnais global isolé et exécuter la matrice.
**Responsable :** QA/plateforme.
**Statut :** bloquant pour acceptation UX.

### LIMITATION — chaîne notifications
**Impact :** l'événement persisté ne prouve pas le traitement, la reprise ou la déduplication.
**Condition de levée :** scénario QA avec worker et fournisseur simulé.
**Responsable :** backend/QA.
**Statut :** bloquant pour promesse de notification.

### LIMITATION — promesse « Activités »
**Impact :** la page planifie des prestations mais ne retrace pas les interactions conseiller↔client.
**Condition de levée :** décision produit explicite et libellé/UX alignés.
**Responsable :** produit.
**Statut :** décision requise.

## Garanties de mandat

- `PRODUCTION_MUTATION: NO`
- `PRODUCT_CODE_CHANGE: NO`
- `PUSH_PR_MERGE: NO`
- `APPLICATION_DEPLOYMENT: NO`
- `PRODUCTION_WORKFLOW_EXECUTED: NO`
- `REAL_NOTIFICATION: NO`
- `WEB_AI_ACTIVATION: NO`
