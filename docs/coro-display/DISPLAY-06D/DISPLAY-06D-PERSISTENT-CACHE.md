# Cache persistant

Le cache 06C est réutilisé : SHA-256 et manifeste vérifiés, séquence monotone, répertoires `next/current/previous`, refus des liens symboliques et restauration de la génération précédente. `restore()` accepte désormais les révocations locales connues.

Les suites fondation/adversariales et l’E2E valident corruption, rollback, redémarrage et cache hors ligne. Une génération connue révoquée n’est pas restaurée.
