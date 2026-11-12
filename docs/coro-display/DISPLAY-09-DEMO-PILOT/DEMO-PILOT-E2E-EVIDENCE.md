# Preuves E2E

PASS : navigation bâtiment conditionnelle, transmission du bâtiment, chargement filtré, contrats Player view-only, session privée, anti-framing, compilation TypeScript/Next et PDF V1/V2.

Le scénario intégré `display-06c-operational-e2e.spec.ts` a été rejoué sur PostgreSQL 16 jetable au SHA candidat : PASS. Il crée trois organisations, bâtiment/étage/emplacement et professionnel synthétiques, puis exécute HTTP réel, invitation/enrôlement, session, publication approuvée, manifeste signé, rendu privé, Chromium headless, confirmation, redémarrage/cache hors ligne et révocation/refus. Aucun mock ne remplace PostgreSQL, HTTP, le stockage privé ou Chromium.

Limite : les PDF V1/V2 du pilote ont été validés comme actifs, mais leur import par l'interface documentaire du portail dans cette même exécution n'est pas couvert; aucune donnée Tour Prémont réelle n'a été utilisée.
