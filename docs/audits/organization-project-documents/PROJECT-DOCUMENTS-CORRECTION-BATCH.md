# Lot de correction proposé — à autoriser séparément

## Lot A — frontière d’autorisation (bloquant)

1. Introduire une décision canonique unique pour résoudre le projet parent avec `projectAccessWhere(actor)` et `isActive: true`.
2. L’appliquer avant liste, dépôt, contenu, téléchargement, historique et résolution courante.
3. Résoudre le parent côté serveur; ne jamais accepter `projectId`, `buildingId` ou `fileId` comme preuve d’autorisation.
4. Refuser les mutations documentaires d’un projet archivé tout en conservant les lectures historiques explicitement autorisées.
5. Vérifier zéro objet stocké, ligne, événement ou notification après refus.

## Lot B — références historiques

Inventorier les références persistées, distinguer privées/publiques/absentes, puis faire passer les téléchargements compatibles par une résolution allowlistée et authentifiée. Aucun fetch d’URL arbitraire. Toute migration d’objet public doit être gouvernée et réversible sans rétablir l’exposition.

## Lot C — vérité UX

Ajouter des états distincts chargement/vide/refus/erreur, un contrôle de reprise et une explication lorsque le téléchargement historique est interdit. Afficher les capacités selon l’autorité reçue du serveur, sans en faire une barrière de sécurité.

## Recette exigée après correction

- PostgreSQL 16 et stockage privé QA isolés.
- Deux organisations; opérateur affecté, non affecté, administrateur et identité inactive.
- Projets actif, archivé et désactivé.
- PDF et au moins un autre format supporté; comparaison exacte taille/SHA-256.
- Refus anonyme, inter-tenant, même tenant hors périmètre et bâtiment incorrect.
- Panne stockage/liste/téléchargement et reprise sans doublon.
- 12 combinaisons viewport/thème avec bounding boxes, modale, textes longs, actions et absence de débordement.

Ce document est un plan, pas une autorisation de modifier le produit.
