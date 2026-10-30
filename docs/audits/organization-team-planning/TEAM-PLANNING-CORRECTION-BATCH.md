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
