export type PricingModel =
  | 'FLAT'
  | 'PER_UNIT'
  | 'PER_SEAT'
  | 'PER_SITE'
  | 'TIERED'
  | 'USAGE'
  | 'COMPLEXITY'
  | 'CUSTOM';
export type CalculationStatus = 'CALCULATED' | 'ESTIMATED' | 'MANUAL' | 'TBD';
export type TierMode = 'VOLUME' | 'GRADUATED';

export interface PricingTierInput {
  minimumQuantity: string;
  maximumQuantity?: string | null;
  amountMinor: string;
}
export interface PricingAdjustmentInput {
  scope: 'GLOBAL' | 'COMPONENT' | 'CUSTOM_COMPONENT';
  type: 'PERCENT_DISCOUNT' | 'FIXED_OVERRIDE' | 'CUSTOM_FIXED_PRICE';
  basisPoints?: number;
  amountMinor?: string;
  justification: string;
}
export interface PricingLineInput {
  code: string;
  pricingModel: PricingModel;
  chargeType: 'RECURRING' | 'ONE_TIME';
  billingPeriod?: 'MONTH' | 'YEAR' | null;
  metric?:
    | 'FIXED'
    | 'HOUR'
    | 'SEAT'
    | 'SITE'
    | 'CLIENT'
    | 'USAGE_UNIT'
    | 'COMPLEXITY'
    | null;
  quantity?: string | null;
  quantityUnit?: string | null;
  amountMinor?: string | null;
  tierMode?: TierMode | null;
  tiers?: PricingTierInput[];
  requestedStatus?: CalculationStatus;
  justification?: string | null;
  adjustments?: PricingAdjustmentInput[];
}
export interface PricingRequest {
  currency: 'CAD';
  calculationVersion: string;
  lines: PricingLineInput[];
  globalAdjustments?: PricingAdjustmentInput[];
  includeEstimatedUsageInFirstYear?: boolean;
}
export interface PricingTierResult extends PricingTierInput {
  quantityApplied: string;
  extendedAmountMinor: string;
}
export interface PricingLineResult extends PricingLineInput {
  catalogUnitAmountMinor: string | null;
  catalogExtendedAmountMinor: string | null;
  proposedUnitAmountMinor: string | null;
  proposedExtendedAmountMinor: string | null;
  tiersUsed: PricingTierResult[];
  calculationFormula: string | null;
  explanation: string;
  status: CalculationStatus;
  warnings: string[];
}
export interface PricingResult {
  currency: 'CAD';
  calculationVersion: string;
  lines: PricingLineResult[];
  totals: {
    oneTimeTotalMinor: string | null;
    recurringMonthlyCadenceMinor: string | null;
    recurringAnnualCadenceMinor: string | null;
    monthlyRecurringEquivalentMinor: string | null;
    annualRecurringEquivalentMinor: string | null;
    estimatedUsageTotalMinor: string | null;
    firstYearCommitmentMinor: string | null;
    firstYearIncludesEstimate: boolean;
  };
}

const DECIMAL_SCALE = 1_000_000n;

function positiveDecimal6(value: string, label: string): bigint {
  if (!/^\d+(?:\.\d{1,6})?$/.test(value))
    throw new Error(`${label} must be a decimal with at most 6 places`);
  const [whole, fraction = ''] = value.split('.');
  const scaled =
    BigInt(whole) * DECIMAL_SCALE + BigInt(fraction.padEnd(6, '0'));
  if (scaled <= 0n) throw new Error(`${label} must be positive`);
  return scaled;
}

const halfUp = (numerator: bigint, denominator: bigint) =>
  (numerator + denominator / 2n) / denominator;

const integer = (value: string | null | undefined, name: string) => {
  if (value == null || !/^\d+$/.test(value))
    throw new Error(`${name} must be a non-negative integer`);
  return BigInt(value);
};
const exactDiscount = (amount: bigint, bp: number) => {
  if (!Number.isInteger(bp) || bp < 0 || bp > 10000)
    throw new Error('Invalid discount basis points');
  const numerator = amount * BigInt(bp);
  if (numerator % 10000n !== 0n)
    throw new Error('Discount produces fractional minor units');
  return numerator / 10000n;
};
const nullable = (n: bigint | null) => (n === null ? null : n.toString());

export class ProposalPricingEngine {
  calculate(request: PricingRequest): PricingResult {
    if (request.currency !== 'CAD')
      throw new Error('Phase 2D supports CAD only');
    const globals = request.globalAdjustments ?? [];
    const lines = request.lines.map((line) => this.line(line, globals));
    let one = 0n,
      month = 0n,
      year = 0n,
      usage = 0n;
    let hasOne = false,
      hasMonth = false,
      hasYear = false,
      hasUsage = false,
      hasTbd = false;
    for (const line of lines) {
      if (line.status === 'TBD' || line.proposedExtendedAmountMinor === null) {
        hasTbd = true;
        continue;
      }
      const amount = BigInt(line.proposedExtendedAmountMinor);
      if (line.pricingModel === 'USAGE' && line.status === 'ESTIMATED') {
        usage += amount;
        hasUsage = true;
      } else if (line.chargeType === 'ONE_TIME') {
        one += amount;
        hasOne = true;
      } else if (line.billingPeriod === 'MONTH') {
        month += amount;
        hasMonth = true;
      } else if (line.billingPeriod === 'YEAR') {
        year += amount;
        hasYear = true;
      }
    }
    const monthlyEquivalent =
      hasMonth || hasYear
        ? (() => {
            if (year % 12n !== 0n)
              throw new Error(
                'Annual cadence cannot be represented exactly as monthly minor units',
              );
            return month + year / 12n;
          })()
        : null;
    const annualEquivalent = hasMonth || hasYear ? month * 12n + year : null;
    const includeEstimate = Boolean(
      request.includeEstimatedUsageInFirstYear && hasUsage,
    );
    const firstYear = hasTbd
      ? null
      : one + (annualEquivalent ?? 0n) + (includeEstimate ? usage : 0n);
    return {
      currency: 'CAD',
      calculationVersion: request.calculationVersion,
      lines,
      totals: {
        oneTimeTotalMinor: hasOne ? one.toString() : null,
        recurringMonthlyCadenceMinor: hasMonth ? month.toString() : null,
        recurringAnnualCadenceMinor: hasYear ? year.toString() : null,
        monthlyRecurringEquivalentMinor: nullable(monthlyEquivalent),
        annualRecurringEquivalentMinor: nullable(annualEquivalent),
        estimatedUsageTotalMinor: hasUsage ? usage.toString() : null,
        firstYearCommitmentMinor: nullable(firstYear),
        firstYearIncludesEstimate: includeEstimate,
      },
    };
  }

  private line(
    line: PricingLineInput,
    globals: PricingAdjustmentInput[],
  ): PricingLineResult {
    const perUnitQuantity =
      line.pricingModel === 'PER_UNIT' && line.quantity != null
        ? positiveDecimal6(line.quantity, 'quantity')
        : null;
    const q =
      line.pricingModel === 'PER_UNIT' || line.quantity == null
        ? null
        : integer(line.quantity, 'quantity');
    let unit =
      line.amountMinor == null
        ? null
        : integer(line.amountMinor, 'amountMinor');
    let catalog: bigint | null = null;
    let formula: string | null = null;
    let status: CalculationStatus = line.requestedStatus ?? 'CALCULATED';
    let tiersUsed: PricingTierResult[] = [];
    const warnings: string[] = [];
    if (line.pricingModel === 'FLAT') {
      if (q !== null && q !== 1n)
        throw new Error('FLAT quantity must be absent or 1');
      catalog = unit;
      formula = 'flat amount';
    } else if (line.pricingModel === 'PER_UNIT') {
      if (line.metric !== 'HOUR')
        throw new Error('PER_UNIT requires the HOUR metric');
      if (perUnitQuantity === null || unit === null)
        throw new Error('PER_UNIT requires quantity and unit amount');
      catalog = halfUp(perUnitQuantity * unit, DECIMAL_SCALE);
      formula = `${line.quantity} × ${unit} per ${line.metric}`;
    } else if (
      line.pricingModel === 'PER_SEAT' ||
      line.pricingModel === 'PER_SITE'
    ) {
      if (q === null || unit === null)
        throw new Error(
          `${line.pricingModel} requires quantity and unit amount`,
        );
      catalog = q * unit;
      formula = `${q} × ${unit}`;
    } else if (line.pricingModel === 'TIERED') {
      if (q === null || !line.tierMode || !line.tiers?.length)
        throw new Error('TIERED requires quantity, mode and tiers');
      const tiers = [...line.tiers].sort((a, b) =>
        Number(BigInt(a.minimumQuantity) - BigInt(b.minimumQuantity)),
      );
      if (tiers[0].minimumQuantity !== '1')
        throw new Error('Tier grid must start at 1');
      for (let index = 0; index < tiers.length; index++) {
        const tier = tiers[index],
          next = tiers[index + 1];
        integer(tier.minimumQuantity, 'tier min');
        integer(tier.amountMinor, 'tier amount');
        if (tier.maximumQuantity == null && next)
          throw new Error('Only the last tier may be open');
        if (tier.maximumQuantity != null) {
          const maximum = integer(tier.maximumQuantity, 'tier max');
          if (maximum <= integer(tier.minimumQuantity, 'tier min'))
            throw new Error('Invalid tier bounds');
          if (!next || next.minimumQuantity !== tier.maximumQuantity)
            throw new Error('Tier grid contains a gap or overlap');
        } else if (index !== tiers.length - 1)
          throw new Error('Only the last tier may be open');
      }
      if (tiers[tiers.length - 1].maximumQuantity != null)
        throw new Error('Last tier must be open');
      if (line.tierMode === 'VOLUME') {
        const tier = tiers.find(
          (t) =>
            q >= integer(t.minimumQuantity, 'tier min') &&
            (t.maximumQuantity == null ||
              q < integer(t.maximumQuantity, 'tier max')),
        );
        if (!tier) throw new Error('Quantity is outside published tiers');
        unit = integer(tier.amountMinor, 'tier amount');
        catalog = q * unit;
        formula = `${q} × ${unit} (volume tier)`;
        tiersUsed = [
          {
            ...tier,
            quantityApplied: q.toString(),
            extendedAmountMinor: catalog.toString(),
          },
        ];
      } else {
        catalog = 0n;
        for (const tier of tiers) {
          const min = integer(tier.minimumQuantity, 'tier min'),
            max =
              tier.maximumQuantity == null
                ? q + 1n
                : integer(tier.maximumQuantity, 'tier max');
          const applied = q < min ? 0n : (q + 1n < max ? q + 1n : max) - min;
          if (applied > 0n) {
            const amount = integer(tier.amountMinor, 'tier amount');
            const extended = applied * amount;
            catalog += extended;
            tiersUsed.push({
              ...tier,
              quantityApplied: applied.toString(),
              extendedAmountMinor: extended.toString(),
            });
          }
        }
        formula = tiersUsed
          .map((t) => `${t.quantityApplied} × ${t.amountMinor}`)
          .join(' + ');
      }
    } else if (line.pricingModel === 'USAGE') {
      if (line.requestedStatus === 'TBD' || q === null || unit === null) {
        status = 'TBD';
        catalog = null;
        warnings.push('Usage price or estimated quantity is not configured');
      } else {
        status = 'ESTIMATED';
        catalog = q * unit;
        formula = `estimated ${q} × ${unit}`;
      }
    } else {
      if (line.requestedStatus === 'TBD' || unit === null) {
        status = 'TBD';
        catalog = null;
        warnings.push(`${line.pricingModel} requires an explicit amount`);
      } else {
        status = 'MANUAL';
        catalog = unit;
        formula = 'explicit manual amount';
        if (line.pricingModel === 'CUSTOM' && !line.justification?.trim())
          throw new Error('CUSTOM pricing requires justification');
      }
    }
    let proposed = catalog;
    const adjustments = [...globals, ...(line.adjustments ?? [])];
    for (const adj of adjustments) {
      if (proposed === null) throw new Error('Cannot adjust a TBD line');
      if (adj.type === 'PERCENT_DISCOUNT')
        proposed -= exactDiscount(proposed, adj.basisPoints!);
      else proposed = integer(adj.amountMinor, 'overrideAmountMinor');
    }
    return {
      ...line,
      catalogUnitAmountMinor: nullable(unit),
      catalogExtendedAmountMinor: nullable(catalog),
      proposedUnitAmountMinor:
        line.pricingModel === 'FLAT' ? nullable(proposed) : nullable(unit),
      proposedExtendedAmountMinor: nullable(proposed),
      tiersUsed,
      calculationFormula: formula,
      explanation: formula ?? 'To be determined',
      status,
      warnings,
    };
  }
}
