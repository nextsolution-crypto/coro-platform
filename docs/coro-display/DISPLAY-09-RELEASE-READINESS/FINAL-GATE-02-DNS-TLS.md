# Gate 2 — DNS et TLS

Vérification publique du 2026-11-12. Aucune modification DNS ou TLS.

## État et cible

- Zone autoritaire : Cloudflare; NS `olivia.ns.cloudflare.com` et `zeus.ns.cloudflare.com`.
- `display.getcoro.io` : `NXDOMAIN`.
- Player Web : route `/d/{publicDisplayId}` du portail client, service `coro-client-portal`, port interne `3003` dans Compose.
- `https://client.getcoro.io/d/nonexistent-display-id` rejoint bien Cloudflare et le portail Next.js (404 attendue pour un identifiant inexistant).
- Les adresses publiques Cloudflare ne sont pas une cible d'origine et ne doivent pas être copiées.

## Changement préparé, non appliqué

Dans la zone Cloudflare `getcoro.io`, créer un `CNAME` `display` vers `client.getcoro.io`, proxy Cloudflare activé, TTL `Auto`. Cette cible réutilise le service Player existant sans exposer le backend privé. Avant application, confirmer dans Cloudflare que le hostname cible et l'origine de `client.getcoro.io` sont bien gérés dans le même compte et que le proxy accepte l'alias.

TLS : mode Cloudflare `Full (strict)`, certificat Edge couvrant `display.getcoro.io`, origine déjà couverte par le hostname du service existant; ne pas désactiver la validation d'origine. Vérifier après création : DNS, chaîne TLS, redirection HTTPS, `/d/{id}`, CSP/connect-src, cookies, HSTS, `frame-ancestors`, 404/403 et révocation.

Rollback : supprimer uniquement le CNAME `display`, purger le cache du hostname si nécessaire; aucune modification de l'origine ni du portail.

**Verdict : READY_FOR_PROVIDER_CONFIRMATION, public DNS/TLS NOT_VERIFIED.** La configuration est précise mais doit être confirmée dans le compte Cloudflare avant application.
