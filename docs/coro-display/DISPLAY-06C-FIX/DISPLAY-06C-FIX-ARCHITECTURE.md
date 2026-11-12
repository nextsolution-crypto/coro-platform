# Architecture opérationnelle

`Display Manager → DeviceAdministrationService → PostgreSQL → Device Gateway HTTP → DeviceGatewayHttpClient → ConnectedPlayerService → PersistentPlanCache → LocalPlayerOrigin → Chromium`.

Le navigateur ne reçoit que le HTML loopback et le rendu activé. La clé privée reste dans le processus Player. `DeviceGatewayService` concentre l'autorité M2M, les affectations et la distribution privée; aucune seconde autorité documentaire n'est créée.

La migration additive `20261205030000_display_operational_heartbeat` étend `DisplayDevice` sans suppression. Le backend projette ces champs dans l'agrégat du Display Manager, consommé par `DeviceSupervision.tsx`.
