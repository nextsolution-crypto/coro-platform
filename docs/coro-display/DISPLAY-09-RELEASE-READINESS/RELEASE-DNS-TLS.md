# DNS, TLS et proxy

Le 2026-11-12, `display.getcoro.io` retourne `NXDOMAIN`. `client.getcoro.io`, `app.getcoro.io`, `api.getcoro.io` et l'apex résolvent publiquement via Cloudflare et répondent en TLS. La cible autoritaire Cloudflare/origin n'est pas accessible dans ce mandat : `UNRESOLVED`.

Changement préparé mais non applicable sans autorisation : créer le hostname dans la zone existante vers le même service de portail que `client.getcoro.io`, après identification fournisseur de la cible (ne pas copier l'IP anycast publique), proxy/TLS strict, certificat couvrant le hostname, route `/d/{publicDisplayId}`, CSP/connect-src stricts, HSTS, `frame-ancestors 'none'`, rate limiting et journaux sans jetons.

TTL proposé pour le pilote : 300 s, à valider dans le fournisseur. Rollback DNS : retirer uniquement l'enregistrement Display après révocation des sessions; ne toucher à aucun autre hostname.
