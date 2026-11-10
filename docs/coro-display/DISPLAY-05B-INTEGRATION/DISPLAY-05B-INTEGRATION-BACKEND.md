# Backend

Les endpoints `client-portal/display` fournissent la bibliothèque autorisée, les aperçus privés et les observations paginées. L'authentification, la session, l'organisation, le client, les bâtiments, les permissions et l'auteur sont recalculés côté serveur.

Les documents expirés, suspendus, révoqués, remplacés, non courants ou sans rendu admissible sont exclus. Les aperçus revalident le périmètre, le cycle documentaire et le SHA-256 à chaque accès.

L'observation ne mute aucun plan, fichier, rendu, affectation, publication ou commande Display. La concurrence P2002 retourne l'intention existante au lieu de dupliquer.
