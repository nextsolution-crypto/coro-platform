# systemd et supervision OS

## Constat

L'unité n'avait pas de preuve d'exécution réelle et pouvait être davantage confinée.

## Correction

Ajout de RestrictAddressFamilies, capacités vides, filtre syscall, UMask 0077, ProtectProc et ProcSubset, sans installation persistante.

## Preuve et tests

Revue statique de l'unité et tests applicatifs du watchdog.

## Résultat et risque résiduel

PASS statique; exécution systemd sur distribution/mini-PC cible NOT_VERIFIED.
