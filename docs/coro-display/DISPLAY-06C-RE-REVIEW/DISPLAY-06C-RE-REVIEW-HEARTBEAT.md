# Heartbeat

Le Player transmet version logicielle, mode, document, séquence, santé cache/runtime, réseau et erreurs par endpoint M2M dédié. Le scénario retrouve les valeurs PostgreSQL et `lastHeartbeatAt` non nul.

La supervision frontend emploie `HEARTBEAT_FRESHNESS_MS = 2 * 60_000`; ONLINE est donc une estimation de fraîcheur explicite et non une preuve physique.
