/*
 * Sentinelle Population
 *
 * Un incident ne peut posséder qu'un seul ALL_CLEAR
 * non annulé à la fois.
 *
 * L'index est volontairement partiel :
 * - plusieurs UPDATE restent autorisés;
 * - un ALL_CLEAR CANCELLED ne bloque pas son remplacement;
 * - les alertes sans incidentEventId ne sont pas concernées.
 *
 * Cette contrainte complète la validation applicative et
 * protège contre deux créations concurrentes.
 */

CREATE UNIQUE INDEX "PopulationAlert_one_active_all_clear_per_incident"
ON "PopulationAlert" ("incidentEventId")
WHERE
  "incidentEventId" IS NOT NULL
  AND "type" = 'ALL_CLEAR'
  AND "status" <> 'CANCELLED';