# Permissions et multitenant

Permissions distinctes : lecture des plans, prévisualisation, lecture des emplacements, soumission et lecture des observations. Elles ne sont ni implicites ni héritées des pouvoirs professionnels du Display Manager.

Le périmètre effectif est l'intersection des bâtiments du portail et des bâtiments Display. Une liste vide signifie aucun accès. Les contrôles PostgreSQL couvrent trois organisations, bâtiment unique/multiple/absent, autre tenant, UUID deviné, emplacement étranger, auteur différent et soumission manipulée.

La session sélectionne maintenant aussi `displayPermissions` et `displayBuildingIds`; le test de révocation d'une ancienne session a été mis à jour et repasse.
