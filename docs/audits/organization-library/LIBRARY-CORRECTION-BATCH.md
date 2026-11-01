# Lot correctif proposé — Bibliothèque

## Lot 1 — Autorité et source canonique (bloquant)

1. Décider si le catalogue officiel demeure code-versionné ou devient administrable en base.
2. Retirer les mutations mortes, ou les protéger par permission plateforme explicite, DTO strict, concurrence et audit.
3. Interdire tout faux succès : la lecture après écriture doit refléter exactement la source canonique.

Critère : un acteur non habilité reçoit un refus sans écriture; un acteur habilité produit une version traçable immédiatement relue par le même chemin.

## Lot 2 — Héritage de l’autorité projet (bloquant)

1. Faire passer l’acteur typé à `findAllForProject` et `findOne`.
2. Utiliser la même résolution `projectAccessWhere` pour lecture, ajout, retrait et édition.
3. Appliquer la même règle aux custom procedures, avant extraction ou appel fournisseur.
4. Couvrir deux organisations, opérateur hors périmètre, projet inactif/archivé, identifiant connu et absence d’effet secondaire.

## Lot 3 — Résilience et UX (important)

1. États chargement/vide/erreur distincts et accessibles, bouton Réessayer.
2. Recherche et filtrage si le catalogue reste à cette échelle.
3. Provenance, version et date de fraîcheur factuelles.
4. Matrice 390×844, 768×1024, 1440×900 et 2560×1440 sur Classic/Glass Light/Glass Dark.

## Lot 4 — Frontières documentaires et Knowledge (décision produit)

Documenter que ProjectFile reste l’autorité documentaire; définir quelles procédures officielles sont des sources Knowledge admissibles, comment elles sont versionnées, révoquées et citées. Ne pas raccorder automatiquement les catalogues globaux à Knowledge.

## Séquençage

Lot 1 et Lot 2 avant toute ouverture d’administration ou réutilisation élargie; Lot 3 ensuite; Lot 4 après décision de gouvernance documentaire.
