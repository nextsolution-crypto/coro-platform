# Multitenant

Toutes les lectures et mutations sont contraintes par `organizationId` et les `buildingIds` autorisés. Une liste de bâtiments vide refuse l'accès. Les identifiants devinés hors périmètre retournent une absence de ressource.

La migration ajoute des garde-fous PostgreSQL pour les utilisateurs professionnels associés aux observations, les auteurs d'événements et les auteurs de messages. Les clés étrangères composites conservent l'organisation et le bâtiment de l'observation.
