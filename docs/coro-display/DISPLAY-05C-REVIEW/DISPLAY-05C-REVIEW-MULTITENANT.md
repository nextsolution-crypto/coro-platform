# Isolation multitenant

Les requêtes portent simultanément `organizationId`, identifiant d’observation et périmètre de bâtiments. Un identifiant deviné d’une autre organisation retourne une absence contrôlée; aucune donnée brute n’est renvoyée.

Le scénario PostgreSQL utilise trois organisations, des utilisateurs professionnels et clients distincts, puis vérifie lecture croisée, assignation étrangère et révocation de périmètre. Tous les refus sont obtenus sans mutation.

Risque résiduel : la recette HTTP authentifiée réelle reste à rejouer dans l’environnement d’intégration.
