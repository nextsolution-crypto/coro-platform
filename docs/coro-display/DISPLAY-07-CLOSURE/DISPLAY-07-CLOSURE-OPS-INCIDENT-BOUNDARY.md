# Frontière CORO Ops / Incident

DISPLAY-07 fournit l'autorité, la transaction, le ciblage, la signature, le journal Incident et les contrats d'orchestration. Il ne fournit pas l'adaptateur machine entrant Ops/Incident.

Un futur adaptateur devra authentifier une identité de service, vérifier le protocole approuvé et les portées organisation/bâtiment/zone, puis réutiliser les contrôles DISPLAY-07. Les sources `CORO_OPS` et `CORO_INCIDENT` restent fermées aux appels humains et aucune activation implicite n'existe.
