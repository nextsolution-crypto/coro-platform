# Gate 2 — compatibilité origine et routage

Inspection serveur READ ONLY finale : workflow `43430222072`, job `131901566898`.

- routage local vers le Player Web : **PASS**;
- requête Host `display.getcoro.io` vers `/d/nonexistent-display-id` : HTTP 404 attendu;
- `Cache-Control` contient `no-store` : **PASS**;
- runtime avant/après : **inchangé**;
- certificat présenté localement sur 443 : expiration `2027-01-09`;
- SNI/SAN compatible `display.getcoro.io` ou `*.getcoro.io` : **FAIL**.

Le routage applicatif est compatible, mais le certificat actuellement présenté par l'origine ne couvre pas le futur hostname Display. La chaîne de confiance Cloudflare → origine ne peut donc pas être déclarée compatible. Aucun réglage TLS n'a été modifié.

**Verdict : FAIL — ORIGIN_CERTIFICATE_SAN_MISMATCH.**
