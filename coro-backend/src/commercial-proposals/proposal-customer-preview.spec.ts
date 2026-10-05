import { Prisma } from '@prisma/client';
import { buildProposalCustomerPreview } from './proposal-customer-preview';

describe('proposal customer preview', () => {
  const source = {
    proposal: { reference: 'PROP-C6A' },
    revisionNumber: 2,
    recipientLegalName: 'Acme Incorporated',
    recipientDisplayName: 'Acme',
    recipientContactName: 'Customer Contact',
    recipientEmail: 'customer@example.test',
    currency: 'CAD',
    contextFR: 'Contexte approuvé',
    contextEN: 'Approved context',
    termsFR: 'Conditions approuvées',
    termsEN: 'Approved terms',
    validFrom: new Date('2027-01-01T00:00:00Z'),
    validUntil: new Date('2027-02-01T00:00:00Z'),
    oneTimeTotalMinor: 25000n,
    recurringMonthlyCadenceMinor: 10000n,
    recurringAnnualCadenceMinor: null,
    annualRecurringEquivalentMinor: 120000n,
    firstYearCommitmentMinor: 145000n,
    firstYearIncludesEstimate: false,
    lines: [
      {
        displayOrder: 1,
        componentNameFR: 'Abonnement CORO',
        componentNameEN: 'CORO subscription',
        descriptionFR: 'Offre client',
        descriptionEN: 'Customer offer',
        revenueCategory: 'SAAS',
        chargeType: 'RECURRING',
        billingPeriod: 'MONTH',
        quantity: new Prisma.Decimal(10),
        quantityUnit: 'SEAT',
        catalogUnitAmountMinor: 1500n,
        proposedUnitAmountMinor: 1000n,
        catalogExtendedAmountMinor: 15000n,
        proposedExtendedAmountMinor: 10000n,
        justification: 'Internal override reason',
      },
    ],
    inputs: [
      {
        code: 'PROFESSIONALS',
        labelFR: 'Professionnels',
        labelEN: 'Professionals',
        integerValue: 10n,
        unit: null,
        justification: 'Internal input provenance',
      },
      {
        code: 'BILLABLE_RATE',
        labelFR: 'Taux interne',
        labelEN: 'Internal rate',
        moneyMinor: 20000n,
        unit: 'CAD/HOUR',
      },
    ],
    exclusivities: [],
    commitments: [],
    valueAnalysis: {
      estimatedHoursSaved: new Prisma.Decimal(100),
      estimatedCapacityValueMinor: 500000n,
      disclaimerFR: 'Estimation non contractuelle',
      disclaimerEN: 'Non-contractual estimate',
    },
  };

  it('uses offered snapshot prices and an explicit input allowlist', () => {
    const preview = buildProposalCustomerPreview(source as never);
    expect(preview.lines[0]).toMatchObject({
      offeredUnitAmountMinor: '1000',
      offeredExtendedAmountMinor: '10000',
    });
    expect(preview.inputs).toEqual([
      {
        labelFr: 'Professionnels',
        labelEn: 'Professionals',
        value: '10',
        unit: null,
      },
    ]);
    expect(preview.valueAnalysis?.disclaimerFr).toBe(
      'Estimation non contractuelle',
    );
    expect(preview.totals).toMatchObject({
      monthlyRecurringMinor: '10000',
      annualRecurringMinor: null,
      annualRecurringEquivalentMinor: '120000',
      firstYearMinor: '145000',
    });
  });

  it('deeply redacts internal economics, provenance, catalog prices and codes', () => {
    const serialized = JSON.stringify(
      buildProposalCustomerPreview(source as never),
    );
    for (const forbidden of [
      '1500',
      '15000',
      'Internal override reason',
      'Internal input provenance',
      'BILLABLE_RATE',
      'Internal rate',
      'catalogUnitAmountMinor',
      'justification',
      'commercialRuleCode',
      'capabilityId',
      'margin',
      'contribution',
      'costAssumption',
    ])
      expect(serialized).not.toContain(forbidden);
  });
});
