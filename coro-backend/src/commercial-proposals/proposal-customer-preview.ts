import { Prisma } from '@prisma/client';
import {
  assertCustomerSafeProjection,
  customerCadence,
  customerLineGroup,
  customerQuantityLabel,
  customerSafeInputs,
} from './customer-safe-commercial-projection';

export type ProposalCustomerPreviewSource =
  Prisma.CommercialProposalRevisionGetPayload<{
    include: {
      proposal: true;
      lines: true;
      inputs: true;
      exclusivities: { include: { sectors: true } };
      commitments: true;
      valueAnalysis: true;
    };
  }>;

const iso = (value: Date | null | undefined) => value?.toISOString() ?? null;

export function buildProposalCustomerPreview(
  source: ProposalCustomerPreviewSource,
) {
  return assertCustomerSafeProjection({
    sourceType: 'PROPOSAL_REVISION',
    reference: source.proposal.reference,
    revision: source.revisionNumber,
    customer: {
      legalName: source.recipientLegalName,
      displayName: source.recipientDisplayName,
      contactName: source.recipientContactName,
      email: source.recipientEmail,
    },
    currency: source.currency,
    // Proposal snapshots preserve customer-facing component labels, but do not
    // persist a historical commercial-family label. Avoid reconstructing a
    // mutable family classification or mislabelling components as solutions.
    solutions: [],
    lines: source.lines
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((line) => {
        const cadence = customerCadence(line.chargeType, line.billingPeriod);
        const quantityLabel = customerQuantityLabel(line.quantityUnit);
        return {
          labelFr: line.componentNameFR,
          labelEn: line.componentNameEN,
          descriptionFr: line.descriptionFR,
          descriptionEn: line.descriptionEN,
          group: customerLineGroup(line.revenueCategory),
          quantity: line.quantity?.toString() ?? null,
          quantityLabelFr: quantityLabel?.fr ?? null,
          quantityLabelEn: quantityLabel?.en ?? null,
          offeredUnitAmountMinor:
            line.proposedUnitAmountMinor?.toString() ?? null,
          offeredExtendedAmountMinor:
            line.proposedExtendedAmountMinor?.toString() ?? null,
          cadenceFr: cadence.fr,
          cadenceEn: cadence.en,
        };
      }),
    totals: {
      oneTimeMinor: source.oneTimeTotalMinor?.toString() ?? null,
      monthlyRecurringMinor:
        source.recurringMonthlyCadenceMinor?.toString() ?? null,
      annualRecurringMinor:
        source.recurringAnnualCadenceMinor?.toString() ?? null,
      annualRecurringEquivalentMinor:
        source.annualRecurringEquivalentMinor?.toString() ?? null,
      firstYearMinor: source.firstYearCommitmentMinor?.toString() ?? null,
      firstYearIncludesEstimate: source.firstYearIncludesEstimate,
    },
    inputs: customerSafeInputs(source.inputs),
    includedFeatures: [],
    valueAnalysis: source.valueAnalysis
      ? {
          estimatedHoursSaved:
            source.valueAnalysis.estimatedHoursSaved.toString(),
          estimatedCapacityValueMinor:
            source.valueAnalysis.estimatedCapacityValueMinor.toString(),
          disclaimerFr: source.valueAnalysis.disclaimerFR,
          disclaimerEn: source.valueAnalysis.disclaimerEN,
        }
      : null,
    exclusivities: source.exclusivities.map((item) => ({
      territory: item.territoryLabel,
      sectors: item.sectors.map((sector) => sector.sectorLabel),
      startsAt: item.startsAt.toISOString(),
      endsAt: iso(item.endsAt),
    })),
    commitments: source.commitments.map((item) => ({
      labelFr: item.description ?? 'Engagement commercial',
      labelEn: item.description ?? 'Commercial commitment',
      value: String(item.quantity ?? item.amountMinor ?? ''),
    })),
    commercialTerms: {
      contextFr: source.contextFR,
      contextEn: source.contextEN,
      termsFr: source.termsFR,
      termsEn: source.termsEN,
    },
    validity: {
      validFrom: iso(source.validFrom),
      validUntil: iso(source.validUntil),
    },
  });
}
