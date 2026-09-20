/* One non-cancelled ALL_CLEAR per operational event, including events
 * that are not linked to an IncidentEvent. */
CREATE UNIQUE INDEX "PopulationAlert_one_active_all_clear_per_operational_event"
ON "PopulationAlert" ("operationalEventId")
WHERE
  "operationalEventId" IS NOT NULL
  AND "type" = 'ALL_CLEAR'
  AND "status" <> 'CANCELLED';
