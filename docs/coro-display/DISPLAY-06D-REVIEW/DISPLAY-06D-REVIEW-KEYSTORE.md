# Keystore

## Constats

L'interface `NonExportableSigner` ne propose aucune méthode d'export et les tests synthétiques signent correctement. Aucun adaptateur Windows CNG, TPM2 ou PKCS#11 réel n'est fourni ou invoqué.

## Défaut bloquant

`connected-player-main.ts` construit `EnvironmentDeviceKeyStore` depuis `CORO_DISPLAY_DEVICE_PRIVATE_KEY_PEM`. La clé est donc exportable et visible au processus/environnement. L'abstraction annoncée n'est pas le chemin d'exécution.

## Tests et limites

Adaptateur synthétique: PASS. Clé absente/révoquée, rotation OS, identité du processus et tentative d'export matériel: NOT_VERIFIED. Verdict: **FAIL P0**.
