# Watchdog et récupération

## Constat
`OperationalWatchdog` calculait des décisions sans sonder Player/Chromium dans le runtime réel.

## Correction
`RuntimeWatchdogController` sonde les handlers vivants, journalise, redémarre Chromium avec limite/backoff et fait échouer le Player lorsque le circuit s'ouvre, sans effacer cache ou urgence.

## Preuve et tests
Heartbeat périmé/futur, processus mort/bloqué, reprise, crash loop, circuit breaker et urgence conservée; E2E `restart.png` et `restart-process.json`.

## Résultat et risque résiduel
PASS logiciel; comportement 24 h sous pression matérielle NOT_VERIFIED.

