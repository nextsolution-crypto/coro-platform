# Heartbeat

Le heartbeat dédié transmet version logicielle, mode, document, séquence, santé cache/runtime, état réseau et erreurs. Le scénario vérifie la persistance PostgreSQL et la lecture par la supervision.

La politique frontend estime ONLINE sur une fraîcheur explicite de deux minutes. Elle ne prétend pas prouver l’état physique.
