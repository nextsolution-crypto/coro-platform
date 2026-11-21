# PostgreSQL et E2E

Environnement final : conteneur PostgreSQL 16 Alpine dédié sur loopback, base vide synthétique. Les 187 migrations ont été appliquées depuis zéro; la seconde passe a retourné `No pending migrations`.

`display-06c-operational-e2e.spec.ts` : PASS. Parcours démontré avec Nest HTTP réel, PostgreSQL, stockage privé local, invitation/enrôlement, session, publication approuvée, manifeste signé, Chromium headless, confirmation, cache/reconnexion et révocation/refus. Le conteneur jetable a été supprimé après la recette.
