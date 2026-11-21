# Registre P0

| Contrôle | Résultat | Preuve |
|---|---|---|
| URL opaque | PASS | génération aléatoire et tests service |
| Activation atomique | PASS | code haché, expiration, usage unique |
| P-256 | PASS | import cryptographique Node et tests négatifs |
| Multitenant | PASS | portées organisation/bâtiment/emplacement |
| Publication approuvée | PASS | résolution limitée à la version publiée |
| CSP | PASS | Chromium réel après correction nonce |
| Profils critiques Web | PASS | non autorisés |
| Hors ligne permanent | NON GARANTI | limite explicitement conservée |
