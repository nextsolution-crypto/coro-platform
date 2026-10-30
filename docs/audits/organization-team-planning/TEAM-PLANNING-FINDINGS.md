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
