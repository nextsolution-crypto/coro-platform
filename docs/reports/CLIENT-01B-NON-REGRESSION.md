# CLIENT-01B — Non-régression

Périmètre exécuté sur le candidat :

- validation et génération Prisma;
- build NestJS;
- tests ciblés Report, main courante, quarts, consignes et suivis;
- tests unitaires de provenance;
- chaîne complète de 196 migrations sur PostgreSQL 16 jetable;
- tests PostgreSQL de refus inter-tenant et d’immutabilité.

Sentinelle, Display et les transports externes ne sont pas modifiés. Aucun fournisseur, notification, donnée client ou environnement partagé n’est utilisé.
