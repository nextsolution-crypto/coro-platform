# Watchdog

`OperationalWatchdog` distingue Player, Chromium et réactivité du rendu. Il redémarre Chromium seul si le Player demeure sain, redémarre le Player si son processus est dégradé, applique 1/2/4/8 secondes de backoff par défaut et ouvre le circuit après épuisement du budget.

Test : deux reprises autorisées à 100/200 ms puis `RESTART_BUDGET_EXHAUSTED`; l’état `emergencyActive` n’est jamais modifié par le watchdog. Contrôle ciblé : PASS.
