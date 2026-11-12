# Architecture opérationnelle

Chaîne : Gateway → `ConnectedPlayerService` → keystore → cache atomique → état d’urgence HMAC → origine loopback → Chromium → superviseur OS. Le journal et le registre de révocations sont des autorités locales distinctes. Chromium ne reçoit ni clé privée, ni URL privée du Gateway.

Le nouveau `operational-resilience.ts` concentre les politiques testables sans piloter directement l’OS. `coro-display-player.service` confie démarrage/restart et restrictions de privilèges à systemd. L’interface de signature délègue au fournisseur OS sans fonction d’export.
