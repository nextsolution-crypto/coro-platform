# DISPLAY-05A — Résumé exécutif

DISPLAY-05A intègre un gestionnaire de plans à l'application CORO, sans créer une autorité parallèle. L'espace `/display` présente les bâtiments affectés, leur implantation, les emplacements, les versions de plans, les sources PDF approuvées et l'historique autorisé.

Le serveur applique les permissions Display explicites et l'affectation au bâtiment. Un rôle ADMIN ou SUPER_ADMIN ne donne aucun accès implicite. Les aperçus restent privés et sont chargés par requête authentifiée. Aucune donnée de périphérique n'étant modélisée, l'interface affiche explicitement « non enregistré » au lieu d'inventer un parc.

État : **GO CONDITIONNEL DISPLAY-05A-REVIEW**. Les builds passent et les tests ciblés passent. La recette navigateur authentifiée et PostgreSQL jetable complète restent `NOT_VERIFIED` dans cette exécution.
