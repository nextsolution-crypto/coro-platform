export const CUSTOMER_SAFE_INPUT_CODES = Object.freeze([
  'PROFESSIONALS',
  'CLIENTS',
  'SITES',
  'POPULATION_INSTALLATIONS',
] as const);

const customerInputCodes = new Set<string>(CUSTOMER_SAFE_INPUT_CODES);

export type CustomerSafeCommercialProjection = {
  sourceType: 'RUN_PREVIEW' | 'PROPOSAL_REVISION';
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
    descriptionEn: string | null;
    group:
      | 'SUBSCRIPTION'
      | 'IMPLEMENTATION'
      | 'PROFESSIONAL_SERVICES'
      | 'OTHER';
    quantity: string | null;
    quantityLabelFr: string | null;
    quantityLabelEn: string | null;
    offeredUnitAmountMinor: string | null;
    offeredExtendedAmountMinor: string | null;
    cadenceFr: string;
    cadenceEn: string;
  }>;
  totals: {
    oneTimeMinor: string | null;
    monthlyRecurringMinor: string | null;
    annualRecurringMinor: string | null;
    firstYearMinor: string | null;
    firstYearIncludesEstimate: boolean;
  };
  inputs: Array<{
    labelFr: string;
    labelEn: string | null;
    value: string;
    unit: string | null;
  }>;
  includedFeatures: Array<{ labelFr: string; labelEn: string }>;
  valueAnalysis: null | {
    estimatedHoursSaved: string;
    estimatedCapacityValueMinor: string;
    disclaimerFr: string;
    disclaimerEn: string | null;
  };
  exclusivities: Array<{
    territory: string;
    sectors: string[];
    startsAt: string;
    endsAt: string | null;
  }>;
  commitments: Array<{ labelFr: string; labelEn: string; value: string }>;
  commercialTerms: {
    contextFr: string | null;
    contextEn: string | null;
    termsFr: string | null;
    termsEn: string | null;
  };
  validity: { validFrom: string | null; validUntil: string | null };
};

export const customerLineGroup = (category: string | null | undefined) => {
  if (category === 'SAAS') return 'SUBSCRIPTION' as const;
  if (category === 'IMPLEMENTATION') return 'IMPLEMENTATION' as const;
  if (category === 'PROFESSIONAL_SERVICE')
    return 'PROFESSIONAL_SERVICES' as const;
  return 'OTHER' as const;
};

export const customerCadence = (
  chargeType: string,
  billingPeriod?: string | null,
) => {
  if (chargeType === 'ONE_TIME') return { fr: 'Ponctuel', en: 'One-time' };
  if (billingPeriod === 'MONTH') return { fr: 'Mensuel', en: 'Monthly' };
  if (billingPeriod === 'YEAR') return { fr: 'Annuel', en: 'Annual' };
  return { fr: 'Selon utilisation', en: 'Usage-based' };
};

export const customerQuantityLabel = (unit?: string | null) => {
  const labels: Record<string, { fr: string; en: string }> = {
    SEAT: { fr: 'professionnels', en: 'professionals' },
    SITE: { fr: 'sites', en: 'sites' },
    HOUR: { fr: 'heures', en: 'hours' },
    FIXED: { fr: 'forfait', en: 'fixed' },
  };
  return unit ? (labels[unit] ?? null) : null;
};

export const customerSafeInputs = <
  T extends {
    code: string;
    labelFR?: string | null;
    labelEN?: string | null;
    labelFr?: string | null;
    labelEn?: string | null;
    decimalValue?: { toString(): string } | string | null;
    integerValue?: bigint | string | null;
    moneyMinor?: bigint | null;
    moneyMinorValue?: bigint | null;
    booleanValue?: boolean | null;
    textValue?: string | null;
    unit?: string | null;
  },
>(
  inputs: readonly T[],
) =>
  inputs
    .filter((input) => customerInputCodes.has(input.code))
    .map((input) => ({
      labelFr: input.labelFR ?? input.labelFr ?? '',
      labelEn: input.labelEN ?? input.labelEn ?? null,
      value: String(
        input.decimalValue ??
          input.integerValue ??
          input.moneyMinor ??
          input.moneyMinorValue ??
          input.booleanValue ??
          input.textValue ??
          '',
      ),
      unit: input.unit ?? null,
    }));

export function assertCustomerSafeProjection(
  projection: CustomerSafeCommercialProjection,
) {
  const serialized = JSON.stringify(projection);
  const forbidden = [
    'costAssumption',
    'estimatedCost',
    'contribution',
    'margin',
    'scopeKey',
    'workspaceId',
    'scenarioId',
    'runId',
    'priceBookVersionId',
    'capabilityId',
    'commercialRuleCode',
    'commercialRuleVersion',
    'justification',
    'catalogUnitAmount',
    'catalogExtendedAmount',
    'packaging',
  ];
  const leak = forbidden.find((field) => serialized.includes(`"${field}"`));
  if (leak) throw new Error(`CUSTOMER_SAFE_PROJECTION_LEAK:${leak}`);
  return projection;
}
