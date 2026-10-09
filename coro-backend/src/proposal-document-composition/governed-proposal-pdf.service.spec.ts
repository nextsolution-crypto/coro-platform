import type { ProposalDocumentCompositionContent } from './proposal-document-composition.types';
import { renderGovernedProposalHtml } from './governed-proposal-pdf.service';

jest.mock('puppeteer', () => ({ __esModule: true, default: {} }));

const content = {
  schemaVersion: 'proposal-document-composition/v1',
  proposalRevisionId: 'revision-a',
  proposalReference: 'PROP-TEST',
  proposalRevisionNumber: 1,
  template: { code: 'CORO_PROFESSIONAL', version: 'proposal-document/v1' },
  language: 'FR',
  familyCodes: ['PROFESSIONAL'],
  recipient: { legalName: 'Client Test', displayName: 'Client Test' },
  issuer: {
    legalName: 'Issuer Verified',
    tradeName: 'CORO',
    officialEmail: 'issuer@example.invalid',
  },
  economics: {
    currency: 'CAD',
    lines: [
      {
        labelFr: 'Abonnement annuel',
        labelEn: 'Annual subscription',
        quantity: '125',
        quantityLabelFr: 'sites actifs',
        quantityLabelEn: 'active sites',
        cadenceFr: 'Annuel',
        cadenceEn: 'Annual',
        offeredExtendedAmountMinor: '1750000',
      },
      {
        labelFr: 'Mise en œuvre',
        labelEn: 'Implementation',
        quantity: '1',
        quantityLabelFr: 'forfait',
        quantityLabelEn: 'package',
        cadenceFr: 'Ponctuel',
        cadenceEn: 'One-time',
        offeredExtendedAmountMinor: '742500',
      },
    ],
    totals: {
      oneTimeMinor: '742500',
      monthlyRecurringMinor: '0',
      annualRecurringMinor: '1750000',
      firstYearMinor: '2492500',
    },
    inputs: [],
    valueAnalysis: null,
    exclusivities: [],
    commitments: [],
    commercialTerms: {
      termsFr: 'Conditions approuvées',
      termsEn: 'Approved terms',
    },
    validity: {},
  },
  sections: [
    {
      code: 'PROPOSED_SOLUTION',
      content: [
        { title: 'CORO Professional', description: 'Solution approuvée.' },
      ],
    },
    {
      code: 'INVESTMENT',
      content: {},
    },
  ],
  clauses: [
    { title: 'Paiement', text: 'Clause approuvée', section: 'ACCEPTANCE' },
  ],
  provenance: {
    contentVersionIds: ['content-v1'],
    legalIssuerVersionId: 'issuer-v1',
    clauseVersionIds: ['clause-v1'],
  },
} as unknown as ProposalDocumentCompositionContent;

describe('governed proposal PDF rendering', () => {
  it('renders exact customer-safe economics without monthly zero or internal cost', () => {
    const html = renderGovernedProposalHtml(content, [], 'ISSUANCE_READY');
    expect(html).toContain('17 500,00 $ CAD');
    expect(html).toContain('7 425,00 $ CAD');
    expect(html).toContain('24 925,00 $ CAD');
    expect(html).not.toContain('Récurrent mensuel');
    expect(html).not.toMatch(
      /estimatedCost|contributionMinor|loadedEffort|coût interne/i,
    );
    expect(html).toContain('Issuer Verified');
    expect(html).toContain('Clause approuvée');
  });

  it('makes incomplete output unmistakably internal and omits legal authority', () => {
    const html = renderGovernedProposalHtml(
      content,
      [{ code: 'VERIFIED_LEGAL_ISSUER_MISSING', severity: 'BLOCKING' }],
      'INTERNAL_DRAFT',
    );
    expect(html.match(/BROUILLON INTERNE/g)?.length).toBeGreaterThanOrEqual(2);
    expect(html).toContain('VERIFIED_LEGAL_ISSUER_MISSING');
    expect(html).not.toContain('Issuer Verified');
    expect(html).not.toContain('Clause approuvée');
    expect(html).not.toContain('Signature<br>');
  });

  it('renders English, wraps long governed clauses and escapes captured text', () => {
    const english = {
      ...content,
      language: 'EN',
      recipient: {
        legalName: '<script>alert("recipient")</script>',
        displayName: 'Synthetic customer',
      },
      economics: {
        ...content.economics,
        commercialTerms: { termsEn: 'Approved English terms' },
      },
      sections: [
        {
          code: 'PROPOSED_SOLUTION',
          content: [
            {
              title: 'Professional resilience',
              description: 'A governed customer-safe solution.',
            },
          ],
        },
      ],
      clauses: [
        {
          title: 'Long approved clause',
          text: `Governed wording ${'remains readable and immutable. '.repeat(80)}`,
        },
      ],
    } as unknown as ProposalDocumentCompositionContent;
    const html = renderGovernedProposalHtml(english, [], 'ISSUANCE_READY');
    expect(html).toContain('Service proposal');
    expect(html).toContain('Approved English terms');
    expect(html).toContain('Long approved clause');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>alert');
    expect(html).not.toContain('Included features</h2>');
  });
});
