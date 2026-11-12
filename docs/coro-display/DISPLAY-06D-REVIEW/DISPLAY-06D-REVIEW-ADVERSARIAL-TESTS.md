# Tests adversariaux

## Résultats

- Traversée/symlink cache: PASS.
- Replay de manifeste et downgrade d'urgence: PASS.
- Altération journal/révocation: PASS.
- Host DNS-rebinding, POST loopback, route inconnue: PASS après correction.
- Manifeste runtime vide/doublon/traversée/symlink: PASS après correction.
- Nonce, signature, tenant étranger: PASS.

Total Display local exécuté: 41 tests PASS; PostgreSQL: 2 PASS.

## Non démontré

Extraction de clé OS, attaque TPM/CNG/PKCS#11, processus local hostile, saturation disque, panne électrique et falsification d'un registre avec secret compromis restent NOT_VERIFIED.
