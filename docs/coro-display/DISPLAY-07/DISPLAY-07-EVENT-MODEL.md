# Modèle d’événement

`DisplayOperationalEvent` contient organisation, bâtiment, zones, incident, protocole, type, gravité, source, exercice, version de charge, acteur, autorisation, corrélation, causation, idempotence et horodatage.

Sources : MANUAL, CORO_OPS, CORO_INCIDENT, SIMULATOR et BUILDING_BRIDGE_FUTURE. La dernière est explicitement refusée. L’événement est append-only au niveau PostgreSQL.
