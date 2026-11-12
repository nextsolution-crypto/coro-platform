# Multitenant

La page ne construit qu'un filtre de bâtiment; elle ne décide jamais de l'accès. `ClientDisplayService` intersecte organisation, client, bâtiments accessibles et bâtiments Display autorisés avant toute projection.

Le test de contrat exige le garde `DISPLAY_CLIENT_PLAN_READ`. Aucune portée globale n'est créée. La preuve PostgreSQL spécifique à la fixture Tour Prémont reste **NOT_VERIFIED** jusqu'à l'exécution intégrée sur une base jetable.
