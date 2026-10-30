# Lot de correction proposé — planification d’équipe

Ce document décrit la suite; il n’autorise aucune modification produit.

## Lot A — intégrité du parcours (priorité 1)

1. Définir le contrat de réponse de création (`id` canonique ou DTO `activityId`) et l’utiliser des deux côtés.
2. Ajouter un test d’intégration UI/API : créer sans créneau, planifier ensuite, reprendre après réponse perdue, vérifier une seule activité et une seule réservation ouverte.
3. Conserver les contrôles existants de tenant, permission, projet actif et disponibilité.

Critère : parcours UI complet sans « Activité introuvable », sans doublon et avec audit canonique.

## Lot B — mobile (priorité 2)

Corriger les grilles du résumé et des filtres, mesurer tous les contrôles à 320 et 390 px dans les trois thèmes, puis vérifier textes longs, menus, drawers et boutons.

Critère : aucun contrôle visible hors viewport, aucune action inaccessible, aucun overflow masqué.

## Lot C — panne et reprise (priorité 2)

Ajouter des états explicites pour le contexte et les actions du mois, ainsi qu’une reprise sans rechargement complet. Tester 503, réponse lente, changement de filtre pendant la requête et conservation du dernier état sûr.

Critère : aucune panne affichée comme un résultat vide et aucune donnée obsolète attribuée au nouveau périmètre.

## Hors lot

Export, synchronisation Outlook, programme annuel, affectations nominatives avancées et toute nouvelle règle de capacité exigent un objectif distinct.

## Exécution du lot autorisé — 2026-10-30

- Lot A : terminé. Contrat typé et idempotence transactionnelle par UUID, avec replay démontré après réponse réputée perdue.
- Lot B : terminé. Responsive mesuré 12/12; aucun contrôle visible hors viewport.
- Lot C : terminé. Contexte et calendrier mensuel échouent explicitement, sans faux vide, avec reprise.
- Régressions : backend Planner 58/58; frontend Planner 76/76; builds backend et frontend PASS; lint ciblé PASS.
- E2E : stack isolé PostgreSQL 16, 162 migrations, MFA local, fournisseurs simulés, réseau deny-by-default; campagne PASS.
- Preuves : `D:\CORO-QA\runs\organization-team-planning\2026-10-30`.

Décision : **LOT TERMINÉ ET PRÊT POUR PR**. Fusion, déploiement, migration de production, communication externe et activation WEB-AI restent explicitement exclus.
