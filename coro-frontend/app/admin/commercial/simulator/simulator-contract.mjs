export const SIMULATOR_API_BASE = "/admin/v1/commercial/simulator";
export const SIMULATOR_OBSERVATION_NOTICE =
  "Internal modeling only — no entitlement, billing, metering, or operational enforcement.";
export const SIMULATOR_TABS = [
  "Configuration",
  "Price",
  "Cost",
  "Value",
  "Comparison",
];
export const SIMULATOR_AUTHORITY = Object.freeze({
  price: "PriceBookVersion",
  cost: "CostAssumptionVersion",
  value: "ValuationAssumptionVersion",
  proposal: "explicit conversion",
});
export const FIRST_WAVE_SERVICE_ROLES = Object.freeze([
  "DELIVERY_PROFESSIONAL",
  "SENIOR_REVIEWER",
]);
export const FIRST_WAVE_HOURLY_PRICING = Object.freeze({
  pricingModel: "PER_UNIT",
  metric: "HOUR",
  quantityUnit: "HOUR",
});
