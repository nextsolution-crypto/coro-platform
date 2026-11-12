# Tests de sécurité

Les suites Display couvrent Ed25519, nonce à usage unique, scope méthode/chemin/corps, tenant, anti-rejeu, anti-rollback, manifeste, cache, urgence, CSP et flags kiosque. Trois organisations synthétiques sont utilisées dans l’E2E; `syntheticOrganizationCount=3`.

Résultats : 67 tests Display PASS, 3 tests conditionnels initialement ignorés; 29 contrôles ciblés PASS; 2 tests PostgreSQL PASS. Aucune fuite interorganisation observée.
