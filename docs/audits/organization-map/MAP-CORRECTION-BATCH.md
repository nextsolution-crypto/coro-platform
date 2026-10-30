# Lot de correction proposé — Carte CORO

Ce document prépare un lot ultérieur. Il n'autorise aucune correction, fusion ou livraison.

## Lot A — sécurité et dépendances

1. Remplacer les chaînes HTML Leaflet par un rendu texte sûr dans Organisation et Portail.
2. Supprimer le chargement runtime UNPKG de la carte Organisation; utiliser la dépendance locale verrouillée.
3. Ajouter les non-régressions XSS et échec de chargement.

Critère : aucune donnée métier n'est interprétée comme HTML; aucune dépendance exécutable tierce non gouvernée n'est nécessaire au rendu.

## Lot B — fournisseur et résilience

1. Afficher l'attribution OpenStreetMap requise.
2. Utiliser l'URL de tuile conforme au contrat courant.
3. Afficher les erreurs API et de tuiles, avec reprise et alternative textuelle.
4. Documenter le fournisseur, le cache, les en-têtes, l'absence de SLA et la procédure de bascule.

Critère : panne simulée explicite, aucun faux écran vide, alternative utilisable.

## Lot C — exactitude et interaction

1. Introduire un validateur partagé de coordonnées finies et bornées qui accepte zéro.
2. Gérer les marqueurs coïncidents.
3. Réconcilier la sélection avec le filtre client.
4. Remplacer ou faire approuver la règle `updatedAt` pour le statut de renouvellement.

Critère : jeux synthétiques couvrant zéro, limites, NaN, coordonnées identiques et changement de filtre.

## Lot D — accessibilité et navigateur

1. Ajouter noms accessibles, focus visible et alternative structurée.
2. Vérifier clavier et zoom 200 %.
3. Exécuter les 12 configurations Chrome et un lecteur d'écran réel si disponible.

Critère : aucune action inaccessible, aucun débordement et état fournisseur annoncé.

## Régressions obligatoires

- portée organisation/client/bâtiment;
- manager, corporate et opérateur;
- refus interorganisation;
- navigation vers le bâtiment;
- erreur/rétablissement API et tuiles;
- XSS stockée synthétique;
- absence de mutation ou notification;
- portail et application Organisation.
