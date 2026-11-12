# Keystore sécurisé

`NonExportableDeviceKeyStore` ne fournit que `keyId`, clé publique et signature. Le fournisseur indique `WINDOWS_CNG`, `LINUX_PKCS11`, `LINUX_TPM2` ou `TEST_SYNTHETIC`; aucune méthode d’export privé n’existe.

Le test Ed25519 synthétique confirme la signature et l’absence de propriété exportable. L’adaptateur historique par variable d’environnement reste journalisé `LEGACY_ENVIRONMENT` et ne doit pas être retenu pour un pilote. TPM/CNG/PKCS#11 matériel : `NOT_VERIFIED` et condition du pilote.
