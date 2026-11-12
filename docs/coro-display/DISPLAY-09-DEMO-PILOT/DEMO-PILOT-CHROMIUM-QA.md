# Chromium QA

Le build Next de production passe et inclut `/buildings/[id]`, `/display` et `/d/[publicDisplayId]`. Les tests de contrat navigateur passent.

Chromium headless réel a été lancé par `display-06c-operational-e2e.spec.ts` contre le backend HTTP, PostgreSQL 16 et le stockage privé jetables : rendu Player, manifeste/publication, cache, reconnexion et révocation PASS.

La navigation visuelle Chromium de la fiche Tour Prémont synthétique vers `/display`, ainsi que des captures du portail et l'import interactif V1/V2, restent **NOT_VERIFIED**. Aucune capture fabriquée n'est jointe.
