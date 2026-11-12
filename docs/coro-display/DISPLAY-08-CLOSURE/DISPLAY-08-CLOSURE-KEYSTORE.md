# Keystore

Le Player requiert une interface de signature Ed25519 externe. Aucune clé privée PEM n'est embarquée dans le Player, Chromium, les journaux ou le dépôt. Les erreurs du signataire sont fail-closed; les mécanismes de révocation et de rotation demeurent gouvernés.

La compatibilité TPM/PKCS#11/CNG et le signataire matériel réel n'ont pas été validés. Aucun secours exportable n'a été introduit.
