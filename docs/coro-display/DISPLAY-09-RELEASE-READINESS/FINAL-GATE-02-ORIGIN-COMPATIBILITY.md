# Gate 2 — compatibilité origine et routage

Le candidat sert le Player par `coro-client-portal` sur le port interne 3003, route `/d/{publicDisplayId}`. Le code appelle uniquement l'API CORO, impose `no-store`, une session opaque Bearer, `WEB_VIEW_ONLY`, l'activation WebCrypto P-256, la révocation et le refus d'urgence réelle.

Contrats ciblés du 2026-11-13 : 3/3 PASS. La CSP de la route impose notamment `frame-ancestors 'none'`, `base-uri 'none'`, `form-action 'self'`; Next ajoute `X-Frame-Options: DENY` et `Referrer-Policy: no-referrer`.

Le portail public actuel confirme la chaîne Cloudflare → Next.js pour `client.getcoro.io`. En revanche, aucune preuve indépendante ne montre le certificat présenté par l'origine, sa chaîne/expiration, le virtual host ou reverse proxy acceptant `display.getcoro.io`, ni un test Host-header isolé. L'edge public masque ces propriétés.

**Verdict : NOT_VERIFIED_ORIGIN_HOST_AND_CERTIFICATE.** Condition minimale : inspection serveur en lecture seule ou test d'origine gouverné démontrant certificat valide et routage du Host, sans créer le DNS.
