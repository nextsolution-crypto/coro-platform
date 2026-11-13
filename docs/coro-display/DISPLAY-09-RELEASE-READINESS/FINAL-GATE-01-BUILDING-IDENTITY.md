# Gate 1 — identité canonique de Tour Prémont

Vérification du 2026-11-12, strictement en lecture seule.

## Preuves acquises

- Le workflow gouverné `Production Demo Coro Readiness Inventory` (run `43326658664`) a confirmé `CORO Démo`, organisation `916f54ec-af22-45e0-99db-a369d9630002`, active, non interne et isolée.
- `PMU — Tour Prémont 2026` et `PCA — Tour Prémont 2026` ont chacun exactement une ligne dans ce tenant et appartiennent au client `Groupe Immobilier Prémont`.
- Le tenant contient sept bâtiments; le rapport agrégé ne publie volontairement ni identifiant ni adresse de bâtiment.
- La session Chrome disponible a été inventoriée, mais toute prise de contrôle échoue avant navigation avec `Cannot read properties of undefined (reading 'timeoutMs')`. Aucune donnée n'a été modifiée.

## Limite bloquante

Le triplet canonique `clientId/buildingId/address`, le statut fictif, les permissions Display et le nombre d'emplacements ne sont pas démontrés par la preuve disponible. Les libellés « Tour Prémont » et « 1200 boulevard Robert-Bourassa » restent des indices. Aucun bâtiment n'est sélectionné arbitrairement.

## Action minimale

Exécuter une requête fixe en transaction PostgreSQL `READ ONLY`, revue et gouvernée, qui filtre l'organisation ci-dessus, le client exact, le nom et l'adresse, refuse toute cardinalité différente de un, et n'émet dans GitHub qu'une empreinte du `buildingId` et les booléens d'autorité. Conserver l'identifiant brut dans l'évidence interne sécurisée uniquement.

**Verdict : CONDITIONAL / UNRESOLVED.** Aucune fixture réelle ne peut être autorisée avant cette preuve.
