# Watchdog

## Constats

`OperationalWatchdog` borne les tentatives, applique un backoff exponentiel et ouvre un circuit. La revue a ajouté le refus des observations vieilles ou futures de plus de 120 secondes. Cependant, aucune instance n'est créée dans `connected-player-main.ts`; aucune sonde de blocage, action de redémarrage ou persistance du budget n'est exécutée.

## Tests

Décisions restart/backoff/circuit et timestamps périmés: PASS unitaire. Crash Node, blocage réel, récupération et conservation d'urgence par un watchdog applicatif: NOT_VERIFIED.

## Risque résiduel

Le service systemd fournit une limite de redémarrage OS, mais ne remplace pas la détection d'un processus vivant mais bloqué. Verdict: **FAIL P0 — mécanisme non intégré**.
