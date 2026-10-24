# CP-005 — Refus documentaire et absence d'effets secondaires

## Défaut reproduit

Le refus chargeait un projet par son seul identifiant, changeait son statut,
créait un commentaire, puis déclenchait un courriel et une notification. Le
périmètre client/bâtiment, le rôle et l'état métier n'étaient pas contrôlés
avant ces effets.

## Règle appliquée

1. rôle Client Portal explicitement autorisé;
2. contrôle canonique du projet parent (organisation, client et bâtiments pour
   `CLIENT_MANAGER`; organisation autorisée pour `CLIENT_CORPORATE`);
3. motif non vide;
4. état source `VALIDATED` ou `EXPORTED`;
5. transition conditionnelle et commentaire de refus dans la même transaction;
6. courriel et notification seulement après le commit gagnant.

Le commentaire porte la provenance `CLIENT_USER` authentifiée introduite par
CP-007. Aucun identifiant d'auteur fourni par le navigateur n'est accepté.

## Idempotence et concurrence

La mise à jour conditionnelle ne peut gagner qu'une fois. Un projet déjà
`IN_PROGRESS`, ou une tentative concurrente perdante, retourne
`alreadyRefused: true` sans nouveau commentaire, courriel ni notification.

## Preuves

- refus hors périmètre avant transaction;
- rôle inconnu refusé avant lecture;
- échec transactionnel sans effet externe;
- refus légitime et provenance client;
- répétition sans duplication;
- matrice PostgreSQL synthétique avec bâtiment autorisé et bâtiment interdit.
