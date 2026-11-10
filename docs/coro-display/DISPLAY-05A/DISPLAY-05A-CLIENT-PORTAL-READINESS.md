# Préparation DISPLAY-05B / 05C

## 05B — portail client

Réutiliser un contrat de lecture distinct, limité au plan publié courant d'un emplacement et à une variante privée signée ou servie après autorisation. Ne jamais exposer l'agrégat de gestion, les SHA internes, les événements ou les brouillons.

## 05C — observations/corrections

Le concept recommandé est une observation append-only liée à `publicationId`, `locationId`, version source et variante exactes, avec état, auteur, assignation et résolution. Elle ne doit ni muter le PDF source ni approuver automatiquement une nouvelle variante.

Aucun portail, Player, contrôleur d'urgence ou modèle 05C n'est implémenté dans 05A.
