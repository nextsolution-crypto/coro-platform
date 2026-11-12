# Trace E2E

Le test `display-06c-operational-e2e.spec.ts` crée trois organisations synthétiques, puis exécute pour l’organisation cible : bâtiment, étage, emplacement, professionnel, appareil, invitation, enrôlement HTTP, publication approuvée, affectation, manifeste signé, rendu privé, cache, activation, Chromium, confirmation, heartbeat et supervision.

La coupure est effective par `app.close()`. Un processus Node distinct exécute `display-player-restart-probe.ts`, relit le cache et l’urgence sans Gateway disponible, relance Chromium et écrit `restart-process.json`. Le PID est différent du PID Jest.

Résultat : 1 scénario PASS; voir `evidence/scenario.json`.
