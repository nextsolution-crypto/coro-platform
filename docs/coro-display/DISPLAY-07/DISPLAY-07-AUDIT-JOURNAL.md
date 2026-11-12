# Journal opérationnel

PostgreSQL conserve événement, autorisation, commande signée, cibles, livraisons, outbox et escalades. L’événement source est append-only; l’identité autorisée d’une commande et la portée des livraisons/outbox sont protégées par triggers.

Le Player ajoute EMERGENCY, GOVERNED_CLEAR et ERROR au journal durable DISPLAY-06D. Les corrélations sont répliquées dans IncidentLog lorsqu’un incident existe.
