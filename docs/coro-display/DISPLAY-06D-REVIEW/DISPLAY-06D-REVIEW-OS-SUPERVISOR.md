# Superviseur OS

## Constats

L'unité utilise un compte non privilégié, `NoNewPrivileges`, `ProtectSystem=strict`, `ProtectHome`, `PrivateTmp`, `PrivateDevices`, protections kernel/cgroups, `Restart=on-failure` et un start limit.

## Écarts

`RestrictAddressFamilies`, `CapabilityBoundingSet`, `SystemCallFilter` et `UMask` sont absents. `EnvironmentFile` porte encore la clé privée PEM du Player. L'efficacité des directives et les permissions des répertoires n'ont pas été validées sur un hôte systemd jetable.

## Verdict

Audit statique: PASS partiel. Exécution systemd: **NOT_VERIFIED**. La présence d'une clé exportable dans l'environnement constitue un blocage d'intégration.
