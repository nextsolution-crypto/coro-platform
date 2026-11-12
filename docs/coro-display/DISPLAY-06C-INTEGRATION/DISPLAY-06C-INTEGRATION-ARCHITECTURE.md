# Architecture consolidée

Le registre PostgreSQL porte appareils, invitations, nonces, affectations, synchronisations, événements et heartbeat. Le Gateway Nest authentifie les requêtes Ed25519 et distribue uniquement les publications affectées. `ConnectedPlayerService` vérifie manifeste et rendu, alimente le cache atomique, confirme la synchronisation puis publie la télémétrie. Chromium lit exclusivement l’origine loopback. `DisplayManagerService` expose la supervision filtrée.

Aucun circuit documentaire ou endpoint public parallèle n’est introduit.
