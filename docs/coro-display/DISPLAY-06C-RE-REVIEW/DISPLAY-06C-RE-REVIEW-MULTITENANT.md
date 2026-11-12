# Multitenant

Le scénario principal crée trois organisations et confirme que la supervision de l’organisation cible n’expose aucun appareil étranger. Les tests PostgreSQL `display-device-06c-review.postgres.spec.ts` refusent les substitutions d’organisation et d’emplacement au niveau base. Les tests Gateway lient appareil, organisation, bâtiment, emplacement, affectation, manifeste, confirmation et heartbeat.

Résultat : PASS logiciel. Aucune donnée client n’a été utilisée.
