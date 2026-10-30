# Constats — planification d’équipe

## PLAN-001 — HIGH — contrat création non aligné avec l’interface

**Reproduction.** `POST /api/planning/activities` répond `201` avec l’objet canonique `{ id, ... }`. `ActivityPlanningDrawer.tsx` exige ensuite `action.activityId` et lève « Activité introuvable » avant l’appel de planification.

**Impact.** Une activité est créée dans le backlog, mais le parcours demandé « créer puis planifier » s’arrête avec une erreur. Une nouvelle tentative peut créer une autre activité.

**Correction attendue.** Aligner un contrat unique et typé entre API et interface, puis tester l’absence de doublon en reprise.

## PLAN-002 — MEDIUM — contrôles tronqués à 390 px

**Reproduction.** Les trois thèmes à 390×844 ont chacun six contrôles visibles dont la bounding box dépasse le viewport. Le débordement global est masqué; la capture montre les cartes d’actions et certains champs coupés à droite. Les neuf configurations de 768 px et plus passent.

**Impact.** Une partie des informations ou actions peut être inaccessible sur mobile étroit.

**Correction attendue.** Contraindre grilles, cartes et champs à `min-width: 0` et à la largeur disponible; rejouer les trois thèmes à 320/390 px.

## PLAN-003 — MEDIUM — panne mensuelle présentée comme absence d’actions

**Preuve code.** Dans `app/planning/page.tsx`, l’échec de pagination de `/planning/actions` en vue mois exécute seulement `setPeriodActions([])`.

**Impact.** Une indisponibilité backend est indistinguable d’un mois sans action, contrairement au chargement principal et au centre d’actions qui affichent une erreur.

**Correction attendue.** État d’erreur mensuel explicite, bouton de reprise et conservation maîtrisée du dernier état valide.

## PLAN-004 — LOW — échec du contexte sans traitement explicite

L’appel `/planning/context` utilise `.then(...)` sans `.catch(...)`. Une panne peut laisser les filtres vides et produire un rejet non traité. Ajouter un état d’erreur/reprise distinct sans transformer l’absence de contexte en absence de clients ou bâtiments.

## Observations non défectueuses

- La visibilité d’un collègue du même tenant est intentionnelle et minimisée; elle ne constitue pas une fuite si les événements restent génériques.
- La capacité sur 12 semaines est clairement libellée informative; elle ne doit pas être vendue comme capacité quotidienne exacte.
- Le conflit de créneau observé durant la mise au point provenait de fixtures QA non nettoyées; le runner final les neutralise et le produit a correctement refusé le chevauchement.

## Statut après correction — 2026-10-30

| Constat | Statut | Preuve de clôture |
|---|---|---|
| PLAN-001 | CLOSED_IN_QA | Réponse `{ activityId }` typée; verrou transactionnel et replay par `requestId`; création et planification rejouées sans doublon. |
| PLAN-002 | CLOSED_IN_QA | Chrome 390×844, 768×1024, 1440×900 et 2560×1440, trois thèmes : 12/12 PASS, zéro contrôle hors viewport. |
| PLAN-003 | CLOSED_IN_QA | Injection 503 sur les actions mensuelles : erreur visible, aucun faux calendrier vide, reprise réussie. |
| PLAN-004 | CLOSED_IN_QA | Injection 503 sur le contexte : erreur visible, référentiels obsolètes neutralisés, reprise réussie. |

Les refus et les reprises n'ont produit aucun Booking supplémentaire, aucune notification externe et aucune donnée inter-tenant. Production : **NON MODIFIÉE**.

## Revue de release — fermeture de la portée `requestId`

La revue finale a détecté puis corrigé un risque de replay incompatible. Les verrous et l'audit portent désormais l'opération et l'empreinte canonique du payload, en plus de l'organisation, de l'acteur et du `requestId`. Les essais E2E démontrent qu'un même identifiant avec un libellé ou une durée différente échoue sans effet secondaire.

Statut : **CLOSED_IN_QA** sur `a7de8fb72912f7f93559177a472f5f08a54ae7d3`; preuve sous `D:\CORO-QA\runs\organization-team-planning-release\2026-10-30`.
