export const CONFIGURATOR_API_BASE =
  "/admin/v1/commercial/simulator/configurator";
export const CONFIGURATOR_ROUTE = "/admin/commercial/configurator";
export const LEGACY_SIMULATOR_ROUTE = "/admin/commercial/simulator";
export const COMMERCIAL_FAMILY_CODES = Object.freeze([
  "PROFESSIONAL",
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
export const GUIDED_SCENARIO_ACTIONS = Object.freeze([
  "create",
  "edit",
  "duplicate",
  "archive",
  "select",
  "calculate",
]);
export const CONFIGURATOR_BOUNDARY_NOTICE =
  "Guided scenario configuration — catalog pricing remains owned by PriceBookVersion and calculation remains owned by the existing Simulator engine.";
