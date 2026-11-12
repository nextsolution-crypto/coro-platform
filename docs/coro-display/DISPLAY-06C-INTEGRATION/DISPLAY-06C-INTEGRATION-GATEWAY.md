# Device Gateway

Les endpoints enrôlement, challenge/nonce, manifeste, rendu privé, confirmation et heartbeat utilisent des DTO validés, l’identité machine et la portée appareil/organisation/bâtiment/emplacement. Méthode, chemin, query, corps, SHA-256, timestamp et nonce sont signés. Le nonce PostgreSQL est consommé atomiquement.

Aucun téléchargement public permanent et aucune session utilisateur substituée à l’identité M2M.
