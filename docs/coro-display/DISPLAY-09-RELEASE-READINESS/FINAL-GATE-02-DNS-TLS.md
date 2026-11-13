# Gate 2 — DNS et TLS

Cloudflare Edge reste qualifié en préparation : zone `getcoro.io`, wildcard Edge actif jusqu'au 14 janvier 2027, `client.getcoro.io` proxifié et `display.getcoro.io` encore NXDOMAIN. Aucun DNS n'a été créé.

L'inspection d'origine `43430222072` démontre que le Player répond correctement au Host prévu, avec 404 et `no-store`, sans mutation du runtime. Elle démontre aussi que le certificat local présenté sur 443 expire le 9 janvier 2027 mais ne contient pas de SAN compatible avec `display.getcoro.io`.

Le mode Cloudflare observé demeure `Full`, pas `Full (strict)`. Le certificat Edge ne corrige pas l'incompatibilité du certificat d'origine.

**Verdict DNS/Edge : PASS préparatoire. Verdict origine/TLS : FAIL.**
