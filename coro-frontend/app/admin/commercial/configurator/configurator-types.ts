export type DriverDefinition = {
  code: string;
  version: string;
  valueType: "DECIMAL" | "INTEGER" | "MONEY" | "TEXT";
  category: string;
  unit: string | null;
  labelFr: string;
  helpFr: string;
  required: boolean;
  visibility: string;
};

export type CommercialFamily = {
  code: string;
  labelFr: string;
  descriptionFr: string;
  availability: "AVAILABLE" | "LIMITED" | "FUTURE";
  capabilityCodes: string[];
  applicableDriverCodes: string[];
  optionalDriverCodes: string[];
};

export type CatalogComponent = {
  id: string;
  code: string;
  labelFr: string;
  descriptionFr: string | null;
  capabilityCode: string;
  revenueCategory: string | null;
  chargeType: "RECURRING" | "ONE_TIME";
  billingPeriod: "MONTH" | "YEAR" | null;
  pricingModel: string;
  metric: string | null;
  catalogAmountCad: string | null;
  tiers: Array<{
    minimumQuantity: string;
    maximumQuantity: string | null;
    amountCad: string;
  }>;
  selectable: boolean;
};

export type FamilyReadiness = {
  familyCode: string;
  availability: string;
  price: { status: string; messages: string[] };
  quantity: { status: string; messages: string[] };
  drivers: { status: string; messages: string[] };
  cost: { status: string; messages: string[] };
  value: { status: string; messages: string[] };
  blockers: string[];
  warnings: string[];
  nextActions: string[];
};

export type GuidedLine = {
  id: string;
  source: "CATALOG_COMPONENT" | "CUSTOM_COMPONENT" | "PROFESSIONAL_SERVICE";
  priceComponentId: string | null;
  name: string;
  pricingModel: "FLAT" | "PER_UNIT";
  chargeType: "RECURRING" | "ONE_TIME";
  revenueCategory: string | null;
  billingPeriod: "MONTH" | "YEAR" | null;
  metric: "FIXED" | "HOUR" | null;
  quantity: string | null;
  proposedUnitAmountCad: string | null;
  justification: string | null;
  displayOrder: number;
  costEfforts: Array<{
    role: "DELIVERY_PROFESSIONAL" | "SENIOR_REVIEWER";
    hours: string;
    justification: string | null;
  }>;
};

export type GuidedScenario = {
  id: string;
  name: string;
  description: string | null;
  status: "ACTIVE" | "ARCHIVED";
  lockVersion: number;
  selected: boolean;
  familyCodes: string[];
  lines: GuidedLine[];
  drivers: Array<{ code: string; value: string; justification: string | null }>;
  stale: boolean | null;
  latestResult: null | {
    calculatedAt: string;
    priceStatus: string;
    costStatus: string;
    valueStatus: string;
    warningCodes: string[];
    firstYearCommitmentCad: string | null;
    firstYearCostCad: string | null;
    contributionCad: string | null;
    marginPercent: string | null;
  };
};

export type GuidedWorkspace = {
  id: string;
  title: string;
  reference: string;
  description: string | null;
  status: string;
  lockVersion: number;
  currency: string;
  selectedScenarioId: string | null;
  target: { type: string; name: string };
  catalog: {
    name: string;
    audience: string;
    versionNumber: number;
    status: string;
  };
  scenarios: GuidedScenario[];
};
