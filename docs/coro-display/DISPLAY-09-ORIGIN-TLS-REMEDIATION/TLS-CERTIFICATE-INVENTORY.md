# Inventaire des certificats

| Couche | Preuve | État |
|---|---|---|
| Edge Cloudflare | wildcard actif, expiration 2027-01-14 (inspection fournisseur antérieure) | PASS edge seulement |
| Origine | expiration 2027-01-09; SAN Display absent | FAIL hostname Display |
| Chaîne origine | non capturée par la preuve précédente | NOT_VERIFIED |
| Renouvellement | documentation historique indique Let's Encrypt/Certbot | NOT_VERIFIED runtime |

Le nouveau contrôle collecte subject, issuer, SAN, dates et empreinte SHA-256, jamais les clés privées.
