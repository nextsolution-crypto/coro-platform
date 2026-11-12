# Portail client

Parcours préparé : fiche bâtiment → carte `CORO Display` → `/display?buildingId=...` → liste limitée au bâtiment. Le lien n'est rendu que pour un utilisateur autorisé et réutilise les composants/boutons existants.

Preuves locales : `npm run test:display-client` PASS, ESLint ciblé PASS et `next build` PASS. La construction couvre la route dynamique `/d/[publicDisplayId]`, `/buildings/[id]` et `/display`. La création/activation n'est pas présentée comme une capacité client lorsqu'elle n'existe pas dans son contrat.
