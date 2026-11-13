# Topologie d'origine

Chemin démontré : Cloudflare (zone `getcoro.io`, proxy actif sur les services existants) → origine HTTPS:443 → route Host `display.getcoro.io` → `coro-client-portal`:3003 → `/d/{publicDisplayId}`.

Le DNS Display demeure NXDOMAIN; le point Cloudflare→origine n'est donc pas encore testable publiquement. Le processus qui écoute 443 reste **NOT_VERIFIED**. Le workflow approfondi inventorie le listener sans lire les environnements ni les clés.
