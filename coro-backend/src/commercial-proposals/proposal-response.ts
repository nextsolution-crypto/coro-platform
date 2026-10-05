import { Prisma } from '@prisma/client';

export const PROPOSAL_DETAIL_INCLUDE = {
  organization: true,
  prospect: true,
  revisions: {
    orderBy: { revisionNumber: 'desc' },
    include: {
      lines: { include: { tiers: true, adjustments: true } },
      inputs: true,
      adjustments: true,
      exclusivities: { include: { sectors: true, capabilities: true } },
      commitments: true,
      valueAnalysis: true,
      documents: true,
    },
  },
} as const satisfies Prisma.CommercialProposalInclude;

export type ProposalDetailResponseSource = Prisma.CommercialProposalGetPayload<{
  include: typeof PROPOSAL_DETAIL_INCLUDE;
}>;

type RevisionMoneySource = {
  oneTimeTotalMinor: bigint | null;
  recurringMonthlyCadenceMinor: bigint | null;
  recurringAnnualCadenceMinor: bigint | null;
  monthlyRecurringEquivalentMinor: bigint | null;
  annualRecurringEquivalentMinor: bigint | null;
  estimatedUsageTotalMinor: bigint | null;
  firstYearCommitmentMinor: bigint | null;
};

const optionalBigInt = (value: bigint | null) => value?.toString() ?? null;

export function proposalRevisionResponse<T extends RevisionMoneySource>(
  revision: T,
) {
  return {
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
    estimatedUsageTotalMinor: optionalBigInt(revision.estimatedUsageTotalMinor),
    firstYearCommitmentMinor: optionalBigInt(revision.firstYearCommitmentMinor),
  };
}

export function proposalDetailResponse(
  proposal: ProposalDetailResponseSource | null,
) {
  if (!proposal) return null;
  return {
    ...proposal,
    revisions: proposal.revisions.map((revision) => ({
      ...proposalRevisionResponse(revision),
      lines: revision.lines.map((line) => ({
        ...line,
        catalogUnitAmountMinor: optionalBigInt(line.catalogUnitAmountMinor),
        proposedUnitAmountMinor: optionalBigInt(line.proposedUnitAmountMinor),
        catalogExtendedAmountMinor: optionalBigInt(
          line.catalogExtendedAmountMinor,
        ),
        proposedExtendedAmountMinor: optionalBigInt(
          line.proposedExtendedAmountMinor,
        ),
        tiers: line.tiers.map((tier) => ({
          ...tier,
          amountMinor: tier.amountMinor.toString(),
          extendedAmountMinor: optionalBigInt(tier.extendedAmountMinor),
        })),
        adjustments: line.adjustments.map((adjustment) => ({
          ...adjustment,
          overrideAmountMinor: optionalBigInt(adjustment.overrideAmountMinor),
        })),
      })),
      inputs: revision.inputs.map((input) => ({
        ...input,
        integerValue: optionalBigInt(input.integerValue),
        moneyMinor: optionalBigInt(input.moneyMinor),
      })),
      adjustments: revision.adjustments.map((adjustment) => ({
        ...adjustment,
        overrideAmountMinor: optionalBigInt(adjustment.overrideAmountMinor),
      })),
      commitments: revision.commitments.map((commitment) => ({
        ...commitment,
        amountMinor: optionalBigInt(commitment.amountMinor),
      })),
      valueAnalysis: revision.valueAnalysis
        ? {
            ...revision.valueAnalysis,
            currentBillableRateMinorPerHour:
              revision.valueAnalysis.currentBillableRateMinorPerHour.toString(),
            estimatedCapacityValueMinor:
              revision.valueAnalysis.estimatedCapacityValueMinor.toString(),
          }
        : null,
    })),
  };
}
