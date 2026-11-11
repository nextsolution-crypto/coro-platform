# DISPLAY-06A-REVIEW — Dépendances et sécurité

Le noyau n'ajoute aucune dépendance. Audit npm runtime : 0 vulnérabilité. Audit complet : 30 alertes préexistantes de développement (4 faibles, 23 modérées, 3 élevées), principalement Jest, CLI Nest et Prisma. Aucun `audit fix --force` n'a été utilisé.

Le scan ciblé de secrets, ESLint et `git diff --check` doivent rester PASS avant le commit final. Poppler conserve sa licence système existante; aucune redistribution n'est ajoutée.
