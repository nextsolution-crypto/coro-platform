# Lot de correction proposé — Rendement

Ce document prépare un lot ultérieur; il n’autorise aucune modification produit.

## Priorité 1 — sémantique et sécurité des données

1. Conserver l'historique des projets archivés dans les lectures et agrégats, mais ajouter un garde serveur partagé qui refuse toute nouvelle écriture sur un projet archivé ou inactif.
2. Formaliser `userId` financier et `asOf`; interdire toute présentation « individuelle » ou « historique » non démontrée.
3. Ajouter des tests à deux organisations, acteurs actifs/inactifs, projet actif/archivé et taux complet/partiel.

Critère d’acceptation : chaque montant et compteur est traçable vers un ensemble déterministe de lignes; une archive reste consultable mais toute création/mutation est refusée avant écriture, événement ou notification.

## Priorité 2 — robustesse et échelle

1. Remplacer les chargements non bornés par des agrégations SQL et/ou pagination stable.
2. Ajouter un contrat de volume, de concurrence et de réponses désordonnées.
3. Supprimer ou neutraliser `MandateService.getRendement` après inventaire final des consommateurs.

Critère d’acceptation : mémoire bornée, ordre stable, compteurs identiques avec couches partagées et pages multiples.

## Priorité 3 — parcours utilisateur

1. Piloter le lien financier avec la capacité réelle, pas seulement le rôle.
2. Exposer les filtres validés et un indicateur de fraîcheur/périmètre.
3. Localiser les codes d’incomplétude et distinguer chargement initial/rechargement.
4. Conserver la vue opérationnelle sans montant financier.

Critère d’acceptation : refus explicite, aucun faux succès, filtres restaurés après F5, états vide/503/reprise et matrice responsive validés.

