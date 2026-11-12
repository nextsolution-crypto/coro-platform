# Cloisonnement multitenant

Les lectures et mutations sont contraintes par organisation, bâtiment et emplacement. Les relations composites PostgreSQL empêchent les associations croisées; la migration crée l’index unique requis avant les clés étrangères composites.

Les URL, codes, sessions, publications et confirmations d’une organisation étrangère sont refusés.
