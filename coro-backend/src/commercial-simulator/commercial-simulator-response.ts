import { Prisma } from '@prisma/client';

export const CALCULATION_RUN_RESPONSE_INCLUDE = {
  priceResult: true,
  lines: true,
  inputs: true,
} as const satisfies Prisma.CommercialSimulationCalculationRunInclude;

export const PROPOSAL_CONVERSION_RESPONSE_INCLUDE = {
  proposal: true,
  proposalRevision: true,
} as const satisfies Prisma.CommercialSimulationProposalConversionInclude;

export type CalculationRunResponseSource =
  Prisma.CommercialSimulationCalculationRunGetPayload<{
    include: typeof CALCULATION_RUN_RESPONSE_INCLUDE;
  }>;

export type ProposalConversionResponseSource =
  Prisma.CommercialSimulationProposalConversionGetPayload<{
    include: typeof PROPOSAL_CONVERSION_RESPONSE_INCLUDE;
  }>;

const optionalBigInt = (value: bigint | null) => value?.toString() ?? null;

/**
 * Projects the immutable Prisma calculation snapshot to its public HTTP shape.
 * Monetary and integer BigInts remain exact decimal values transported as strings.
 */
export function calculationRunResponse(run: CalculationRunResponseSource) {
  return {
    ...run,
    inputs: run.inputs.map((input) => ({
      ...input,
      integerValue: optionalBigInt(input.integerValue),
      moneyMinorValue: optionalBigInt(input.moneyMinorValue),
    })),
    lines: run.lines.map((line) => ({
      ...line,
      catalogUnitAmountMinor: optionalBigInt(line.catalogUnitAmountMinor),
      proposedUnitAmountMinor: optionalBigInt(line.proposedUnitAmountMinor),
      catalogExtendedAmountMinor: optionalBigInt(
        line.catalogExtendedAmountMinor,
      ),
      proposedExtendedAmountMinor: optionalBigInt(
        line.proposedExtendedAmountMinor,
      ),
      estimatedCostMinor: optionalBigInt(line.estimatedCostMinor),
    })),
    priceResult: run.priceResult
      ? {
          ...run.priceResult,
          oneTimeTotalMinor: run.priceResult.oneTimeTotalMinor.toString(),
          recurringMonthlyCadenceMinor:
            run.priceResult.recurringMonthlyCadenceMinor.toString(),
          recurringAnnualCadenceMinor:
            run.priceResult.recurringAnnualCadenceMinor.toString(),
          monthlyRecurringEquivalentMinor:
            run.priceResult.monthlyRecurringEquivalentMinor.toString(),
          annualRecurringEquivalentMinor:
            run.priceResult.annualRecurringEquivalentMinor.toString(),
          estimatedUsageTotalMinor:
            run.priceResult.estimatedUsageTotalMinor.toString(),
          firstYearCommitmentMinor:
            run.priceResult.firstYearCommitmentMinor.toString(),
        }
      : null,
  };
}

/**
 * Projects the durable Proposal conversion result to its public HTTP shape.
 * Proposal snapshot money remains exact and is transported as decimal strings.
 */
export function proposalConversionResponse(
  conversion: ProposalConversionResponseSource,
) {
  const revision = conversion.proposalRevision;
  return {
    ...conversion,
    proposalRevision: {
      ...revision,
      oneTimeTotalMinor: optionalBigInt(revision.oneTimeTotalMinor),
      recurringMonthlyCadenceMinor: optionalBigInt(
        revision.recurringMonthlyCadenceMinor,
      ),
      recurringAnnualCadenceMinor: optionalBigInt(
        revision.recurringAnnualCadenceMinor,
      ),
      monthlyRecurringEquivalentMinor: optionalBigInt(
        revision.monthlyRecurringEquivalentMinor,
      ),
      annualRecurringEquivalentMinor: optionalBigInt(
        revision.annualRecurringEquivalentMinor,
      ),
      estimatedUsageTotalMinor: optionalBigInt(
        revision.estimatedUsageTotalMinor,
      ),
      firstYearCommitmentMinor: optionalBigInt(
        revision.firstYearCommitmentMinor,
      ),
    },
  };
}
