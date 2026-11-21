# Navigation

La fiche `/buildings/[id]` rend `CORO Display` uniquement si l'utilisateur possède `DISPLAY_CLIENT_PLAN_READ`. Le lien encode le bâtiment vers `/display?buildingId=...`; la page Display initialise son filtre depuis ce paramètre.

Le test de contrat vérifie le garde, le lien et le filtre. Le build Next post-fusion valide `/buildings/[id]`, `/display` et `/d/[publicDisplayId]`. La navigation visuelle complète avec captures reste à faire lors de l'acceptation contrôlée.
