# Diagnostic du portail actuel

Preuve code : `coro-client-portal/app/display/page.tsx` fournissait déjà la liste Display et `coro-client-portal/components/AppNavigation.tsx` masquait correctement l'entrée sans `DISPLAY_CLIENT_PLAN_READ`. En revanche, `app/buildings/[id]/page.tsx` ne référençait pas Display.

Correction : la fiche bâtiment charge l'utilisateur courant, vérifie explicitement `DISPLAY_CLIENT_PLAN_READ`, puis expose `/display?buildingId=<id>`. La page Display initialise son filtre à partir de ce paramètre. Le test `display.contract.test.mjs` vérifie le lien, le filtrage et le garde de permission. Aucun feature flag ni droit global n'a été ajouté.
