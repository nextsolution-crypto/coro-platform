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
  packaging: Array<{
    familyCode: string;
    role: "REQUIRED" | "OPTIONAL" | "DEFAULT_SELECTED";
    dependencies: string[];
    exclusions: string[];
    professionalServiceAttachments: string[];
  }>;
};

export type FamilyReadiness = {
  familyCode: string;
  availability: string;
  price: { status: string; messages: string[] };
  packaging: { status: string; messages: string[] };
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
  packaging: {
    policyVersion: string;
    status: "READY" | "BLOCKED";
    blockers: string[];
  };
  lines: GuidedLine[];
  drivers: Array<{ code: string; value: string; justification: string | null }>;
  stale: boolean | null;
  latestResult: null | {
    id: string;
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

export type CustomerSafeProjection = {
  sourceType: "RUN_PREVIEW" | "PROPOSAL_REVISION";
  reference: string | null;
  revision: number | null;
  customer: {
    legalName: string;
    displayName: string;
    contactName: string | null;
    email: string | null;
  };
  currency: string;
  solutions: Array<{ labelFr: string; labelEn: string }>;
  lines: Array<{
    labelFr: string;
    labelEn: string | null;
    descriptionFr: string | null;
    group: string;
    quantity: string | null;
    quantityLabelFr: string | null;
    offeredUnitAmountMinor: string | null;
    offeredExtendedAmountMinor: string | null;
    cadenceFr: string;
  }>;
  totals: {
    oneTimeMinor: string | null;
    monthlyRecurringMinor: string | null;
    annualRecurringMinor: string | null;
    firstYearMinor: string | null;
  };
  inputs: Array<{ labelFr: string; value: string; unit: string | null }>;
  valueAnalysis: null | {
    estimatedHoursSaved: string;
    estimatedCapacityValueMinor: string;
    disclaimerFr: string;
  };
  commercialTerms: { contextFr: string | null; termsFr: string | null };
  validity: { validUntil: string | null };
};

export type ScenarioComparison = {
  baselineScenarioName: string | null;
  scenarios: Array<{
    scenarioId: string;
    name: string;
    selected: boolean;
    state: "CURRENT" | "NOT_CALCULATED" | "RECALCULATION_REQUIRED";
    packaging: "READY" | "BLOCKED";
    totals: null | {
      oneTimeMinor: string | null;
      monthlyRecurringMinor: string | null;
      annualRecurringMinor: string | null;
      firstYearMinor: string | null;
    };
    internalEconomics: null | {
      costMinor: string | null;
      contributionMinor: string | null;
      marginBasisPoints: number | null;
    };
    value: Array<{
      metrics: Array<{
        label: string;
        decimalValue: string | null;
        moneyMinorValue: string | null;
      }>;
    }>;
  }>;
  components: Array<{
    componentCode: string;
    label: string;
    scenarios: Array<{
      scenarioName: string;
      included: boolean;
      change:
        | "BASELINE"
        | "ADDED"
        | "REMOVED"
        | "UNCHANGED"
        | "ABSENT"
        | "UNAVAILABLE";
      professionalService: boolean;
      implementation: boolean;
      quantity: string | null;
      quantityDelta: string | null;
      unitAmountMinor: string | null;
      unitAmountDeltaMinor: string | null;
      extendedAmountMinor: string | null;
      extendedAmountDeltaMinor: string | null;
    }>;
  }>;
};
