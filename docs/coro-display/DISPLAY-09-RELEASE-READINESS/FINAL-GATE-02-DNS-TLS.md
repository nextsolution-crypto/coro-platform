# Gate 2 — DNS et TLS

État fournisseur relevé en lecture seule par le propriétaire le 2026-11-13 : zone `getcoro.io`, SSL/TLS `Full`, certificat Edge wildcard actif jusqu'au 14 janvier 2027, `api`/`app`/`client` proxifiés, aucun DNS `display`, aucune règle WAF personnalisée, rate limiting des routes d'authentification, aucune règle Cache/Redirect simple, Bot Fight actif, TLS minimal 1.0 et Always Use HTTPS désactivé.

Contrôles indépendants : `display.getcoro.io` est `NXDOMAIN`; `client.getcoro.io` résout vers Cloudflare et `https://client.getcoro.io/d/nonexistent-display-id` retourne un 404 Next.js via Cloudflare, `Cache-Control: private, no-cache, no-store` et `cf-cache-status: DYNAMIC`.

Configuration préparée, non appliquée : CNAME proxifié `display` vers `client.getcoro.io`, TTL Auto. Ne jamais utiliser une IP anycast Cloudflare comme origine.

Le certificat Edge wildcard couvre le futur hostname, mais ne prouve ni le certificat d'origine ni l'acceptation du Host `display.getcoro.io`. Le mode observé est `Full`, pas `Full (strict)`. TLS 1.0 et l'absence d'Always Use HTTPS sont des réserves de posture globale, à ne pas changer dans ce mandat.

**Verdict DNS/Edge : PASS préparatoire. Verdict origine/TLS : NOT_VERIFIED. Aucun DNS ou réglage TLS modifié.**
