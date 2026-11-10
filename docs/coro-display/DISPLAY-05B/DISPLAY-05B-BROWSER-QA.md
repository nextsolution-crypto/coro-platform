# DISPLAY-05B — Recette navigateur

Statut final : `NOT_VERIFIED`.

Le connecteur Chrome est disponible, mais aucune session locale client non-production autorisée contenant les permissions et données DISPLAY-05B n’était ouverte. Le canal natif Windows signale par ailleurs une pipe indisponible. Aucun compte de production n’a été utilisé et aucune recette authentifiée n’est revendiquée.

Parcours à exécuter sur données jetables : connexion/MFA, ouverture Display, bâtiment autorisé, plan, aperçu, emplacement, annotation, soumission, confirmation, suivi, refus autre bâtiment, déconnexion. Viewports : bureau, tablette et mobile. Ne pas utiliser de compte de production.

La route `/display` est bien générée par le build Next.js. Les breakpoints 980 px et 640 px ont été contrôlés statiquement; le rendu réel bureau/tablette/mobile reste à exécuter avec une fixture authentifiée.
