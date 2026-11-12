# Multitenant

Le scénario `display-06c-operational-e2e.spec.ts` a été rejoué sur PostgreSQL 16 avec une organisation cible et deux organisations étrangères. Les bâtiment, étage, emplacement, publication, session, manifeste et confirmation demeurent liés à l'organisation cible.

Résultat : PASS. Aucun identifiant de production ni donnée Tour Prémont n'a été utilisé. La résolution canonique du futur bâtiment demeure une action séparée et autorisée au moment du déploiement contrôlé.
