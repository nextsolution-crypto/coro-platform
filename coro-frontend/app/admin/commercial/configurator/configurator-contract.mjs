export const CONFIGURATOR_API_BASE =
  "/admin/v1/commercial/simulator/configurator";
export const CONFIGURATOR_ROUTE = "/admin/commercial/configurator";
export const LEGACY_SIMULATOR_ROUTE = "/admin/commercial/simulator";
export const COMMERCIAL_FAMILY_CODES = Object.freeze([
  "COMPLIANCE",
  "SENTINELLE",
  "INCIDENT_OPS",
  "POPULATION_PUE",
  "BUILDING_BRIDGE",
  "KNOWLEDGE_AI",
  "NETWORK",
  "PROFESSIONAL_SERVICES",
]);
export const GUIDED_WORKSPACE_FIELDS = Object.freeze([
  "title",
  "description",
  "targetType",
  "targetSelector",
  "audience",
  "priceBookSelector",
]);
export const CONFIGURATOR_BOUNDARY_NOTICE =
  "Guided setup only — pricing remains owned by PriceBookVersion and complete scenario editing remains in the advanced Simulator.";
