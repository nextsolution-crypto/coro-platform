# INC-RP-02 — Main courante opérationnelle

## Décision d’architecture

La main courante est un agrégat autonome, limité à une organisation et à un
bâtiment. Elle ne dépend ni d’un `IncidentEvent`, ni des présences Sentinelle.
Un rattachement à un incident ou à CORO Report reste facultatif et ne modifie
jamais l’entrée source.

## Lot 02A

- `OperationalLogEntry` conserve l’événement, l’heure de saisie serveur,
  l’auteur, la localisation, la classification, les données structurées et le
  suivi.
- `OperationalLogEntryRevision` conserve chaque correction sous forme de
  snapshots avant/après et d’une empreinte SHA-256.
- `OperationalLogAuditEvent` journalise les décisions transactionnelles.
- `OperationalLogBuildingAssignment` matérialise une affectation explicite au
  bâtiment sans réutiliser les autorités d’urgence.
- quatre permissions dédiées sont ajoutées sans attribution implicite.
- `OPERATIONAL_LOG_ENABLED` est désactivé par défaut et indépendant de
  `INCIDENT_REPORTS_ENABLED`.

## API 02A

- `POST /organizations/:organizationId/operational-log/entries`
- `GET /organizations/:organizationId/operational-log/entries`
- `GET /organizations/:organizationId/operational-log/entries/:id`
- `GET /organizations/:organizationId/operational-log/entries/:id/history`
- `PATCH /organizations/:organizationId/operational-log/entries/:id`
- `POST /organizations/:organizationId/operational-log/entries/:id/report-association`

Les DTO refusent les propriétés inconnues. Les listes sont bornées à 100,
ordonnées par `eventAt` puis `id`, et filtrées avant pagination. Les créations et
corrections utilisent une clé d’idempotence. Les corrections exigent une version
optimiste et ne réécrivent pas l’historique.

## Lots suivants

- 02B : quarts, équipes et relève avec accusé de réception.
- 02C : consignes permanentes/temporaires, approbation et suivis.
- 02D : UX responsive par profil, pièces jointes privées et conversion guidée
  vers CORO Report.

La migration reste additive. Aucun droit n’est accordé et aucun feature flag
n’est activé par la migration.
