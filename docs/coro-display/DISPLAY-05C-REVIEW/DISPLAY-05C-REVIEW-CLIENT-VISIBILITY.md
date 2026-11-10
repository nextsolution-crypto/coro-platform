# Visibilité client

Les messages `INTERNAL` restent réservés aux professionnels. Les réponses visibles client sont projetées séparément et ne révèlent ni notes internes ni auteurs non autorisés. Le client ne peut consulter que ses propres messages dans son organisation et son bâtiment.

Le test PostgreSQL couvre un message interne, une réponse client, la visibilité auteur et l’absence de fuite croisée. Les entrées HTML/script sont rejetées par la validation de contenu du service.

La validation visuelle du rendu exact reste `NOT_VERIFIED` en navigateur authentifié.
