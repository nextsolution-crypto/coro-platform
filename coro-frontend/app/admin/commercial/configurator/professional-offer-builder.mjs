export const PROFESSIONAL_COMPONENTS = Object.freeze({
  annual: "CORO_PROFESSIONAL_ANNUAL",
  standard: "CORO_PROFESSIONAL_IMPLEMENTATION_STANDARD",
  advanced: "CORO_PROFESSIONAL_IMPLEMENTATION_ADVANCED",
  delivery: "DOCUMENT_COMPLIANCE_DELIVERY_HOUR",
  senior: "DOCUMENT_COMPLIANCE_SENIOR_REVIEW_HOUR",
});

export function capacityBusinessBounds(tier) {
  const minimum = Number(tier.minimumQuantity);
  const maximum =
    tier.maximumQuantity == null ? null : Number(tier.maximumQuantity) - 1;
  return maximum == null ? `${minimum}+` : `${minimum}–${maximum}`;
}

export function professionalDraftFromScenario(scenario, catalog) {
  const lineByComponent = (code) =>
    scenario.lines.find(
      (line) =>
        line.priceComponentId ===
        catalog.find((item) => item.code === code)?.id,
    );
  const activeSites =
    scenario.drivers.find((driver) => driver.code === "ACTIVE_SITES")?.value ??
    lineByComponent(PROFESSIONAL_COMPONENTS.annual)?.quantity ??
    "";
  return {
    capacity: activeSites,
    implementation: lineByComponent(PROFESSIONAL_COMPONENTS.standard)
      ? "STANDARD"
      : "ADVANCED",
    deliveryHours:
      lineByComponent(PROFESSIONAL_COMPONENTS.delivery)?.quantity ?? "0",
    seniorHours:
      lineByComponent(PROFESSIONAL_COMPONENTS.senior)?.quantity ?? "0",
  };
}

export function buildProfessionalDraftRequest({
  scenario,
  catalog,
  state,
  costAssumptionVersionId,
  valuationAssumptionVersionIds,
}) {
  const component = (code) => {
    const found = catalog.find((item) => item.code === code);
    if (!found) throw new Error(`CATALOG_COMPONENT_MISSING:${code}`);
    return found;
  };
  const existing = (code) =>
    scenario.lines.find(
      (line) =>
        line.priceComponentId ===
        catalog.find((item) => item.code === code)?.id,
    );
  const line = (code, quantity) => {
    const current = existing(code);
    return {
      priceComponentId: component(code).id,
      quantity,
      commercialQuantityBasis: "DECLARED",
      proposedUnitAmountCad: current?.proposedUnitAmountCad || undefined,
      justification: current?.justification || undefined,
      costEfforts: current?.costEfforts ?? [],
    };
  };
  const implementationCode =
    state.implementation === "STANDARD"
      ? PROFESSIONAL_COMPONENTS.standard
      : PROFESSIONAL_COMPONENTS.advanced;
  return {
    scenarioId: scenario.id,
    familyCodes: ["PROFESSIONAL"],
    catalogLines: [
      line(PROFESSIONAL_COMPONENTS.annual, state.capacity),
      line(implementationCode, "1"),
      ...(Number(state.deliveryHours) > 0
        ? [line(PROFESSIONAL_COMPONENTS.delivery, state.deliveryHours)]
        : []),
      ...(Number(state.seniorHours) > 0
        ? [line(PROFESSIONAL_COMPONENTS.senior, state.seniorHours)]
        : []),
    ],
    customLines: scenario.lines
      .filter((item) => item.source !== "CATALOG_COMPONENT")
      .map((item) => ({
        lineId: item.id,
        name: item.name,
        source: item.source,
        pricingModel: item.pricingModel,
        chargeType: item.chargeType,
        revenueCategory: item.revenueCategory,
        billingPeriod: item.billingPeriod || undefined,
        metric: item.metric || undefined,
        quantity: item.quantity || undefined,
        commercialQuantityBasis: item.commercialQuantityBasis || undefined,
        unitAmountCad: item.proposedUnitAmountCad,
        justification: item.justification,
        costEfforts: item.costEfforts,
      })),
    driverValues: [{ driverCode: "ACTIVE_SITES", value: state.capacity }],
    costAssumptionVersionId: costAssumptionVersionId || undefined,
    valuationAssumptionVersionIds: valuationAssumptionVersionIds?.length
      ? valuationAssumptionVersionIds
      : undefined,
  };
}
