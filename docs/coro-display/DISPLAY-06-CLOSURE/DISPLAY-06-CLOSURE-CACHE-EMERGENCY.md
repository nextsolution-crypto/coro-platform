# Cache et urgence

## Constat

La récupération ne devait jamais effacer le cache ni réinitialiser une urgence.

## Correction

Le watchdog préserve les états; l'intégrité précède l'ouverture; les routes loopback restent bornées. Priorité: REAL > EXERCISE > PERMANENT > NORMAL.

## Preuve et tests

E2E online/offline/emergency/restart, cache invalide et sortie gouvernée; preuve `emergency.png`.

## Résultat et risque résiduel

PASS logiciel; saturation disque et coupure brutale restent à tester physiquement.
