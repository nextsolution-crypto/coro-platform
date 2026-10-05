import { PrismaClient } from '@prisma/client';
import { AdminAuditService } from '../src/admin-audit/admin-audit.service';
import { ProposalPdfService } from '../src/commercial-proposals/proposal-pdf.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { StorageService } from '../src/storage/storage.service';

const renderedHtml: string[] = [];
jest.mock('puppeteer', () => ({
  __esModule: true,
  default: {
    launch: jest.fn(() =>
      Promise.resolve({
        newPage: () =>
          Promise.resolve({
            setContent: (html: string) => {
              renderedHtml.push(html);
              return Promise.resolve();
            },
            pdf: () =>
              Promise.resolve(
                Buffer.from('%PDF-1.7 deterministic test artifact'),
              ),
          }),
        close: () => Promise.resolve(),
      }),
    ),
  },
}));

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;

describeDatabase('Phase 2D proposal PDF concurrency and rendering', () => {
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  const uploadPrivateImmutable = jest.fn(() =>
    Promise.resolve({ storageKey: 'test' }),
  );
  const service = new ProposalPdfService(
    prisma as unknown as PrismaService,
    { uploadPrivateImmutable } as unknown as StorageService,
    new AdminAuditService(),
  );
  const fixture = `p2d_pdf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  let revisionId: string;
  let actorId: string;

  beforeAll(async () => {
    const organization = await prisma.organization.create({
      data: { name: fixture },
    });
    const actor = await prisma.user.create({
      data: {
        email: `${fixture}@example.test`,
        password: 'test-only-not-a-real-credential',
        firstName: 'PDF',
        lastName: 'Tester',
        role: 'SUPER_ADMIN',
        organizationId: organization.id,
        companyName: 'CORO TEST ISSUER',
        companyEmail: 'issuer@example.invalid',
        companyPhone: '+1 555 010 0606',
        companyWebsite: 'https://example.invalid',
        companyAddress: '100 Test Street',
      },
    });
    actorId = actor.id;
    const proposal = await prisma.commercialProposal.create({
      data: {
        reference: fixture,
        title: 'PDF fixture',
        organizationId: organization.id,
        createdByUserId: actor.id,
      },
    });
    const revision = await prisma.commercialProposalRevision.create({
      data: {
        proposalId: proposal.id,
        revisionNumber: 1,
        relationshipSnapshot: 'PARTNER',
        currency: 'CAD',
        validFrom: new Date('2027-01-01T00:00:00Z'),
        validUntil: new Date('2027-02-01T00:00:00Z'),
        recipientLegalName: 'Société Exemple',
        recipientDisplayName: 'Exemple',
        recipientCountry: 'CA',
        recipientPreferredLanguage: 'FR',
        contextFR: 'Contexte français',
        contextEN: 'English context',
        termsFR: 'Conditions françaises',
        termsEN: 'English terms',
        calculationVersion: 'proposal-pricing/v1',
        createdByUserId: actor.id,
        lines: {
          create: {
            source: 'CUSTOM_COMPONENT',
            componentCode: 'TEST',
            componentNameFR: 'Composante test',
            componentNameEN: 'Test component',
            pricingModel: 'USAGE',
            chargeType: 'RECURRING',
            quantity: '4',
            quantityUnit: 'SITE',
            calculationStatus: 'TBD',
            calculationExplanationFR: 'À déterminer',
            internalUse: false,
            distributable: true,
            distributionLimit: '50',
            distributionMetric: 'SITE',
            displayOrder: 1,
          },
        },
        inputs: {
          create: {
            code: 'SITES',
            category: 'QUANTITY',
            valueType: 'INTEGER',
            integerValue: 4n,
            source: 'OBSERVED_SNAPSHOT',
            labelFR: 'Sites observés',
            labelEN: 'Observed sites',
            displayOrder: 1,
          },
        },
      },
    });
    revisionId = revision.id;
    const capability = await prisma.commercialCapability.findUniqueOrThrow({
      where: { code: 'SENTINELLE' },
    });
    await prisma.proposalExclusivity.create({
      data: {
        proposalRevisionId: revision.id,
        territoryType: 'ISO_COUNTRY',
        territoryCode: 'CA',
        territoryLabel: 'Canada',
        startsAt: new Date('2027-01-01T00:00:00Z'),
        sectors: { create: { sectorCode: 'PUBLIC', sectorLabel: 'Public' } },
        capabilities: { create: { capabilityId: capability.id } },
      },
    });
    await prisma.proposalMinimumCommitment.create({
      data: {
        proposalRevisionId: revision.id,
        type: 'MINIMUM_SITES',
        period: 'YEAR',
        quantity: '4',
        unit: 'SITE',
      },
    });
    await prisma.proposalValueAnalysis.create({
      data: {
        proposalRevisionId: revision.id,
        mandatesPerYear: '10',
        averageHoursPerMandate: '5',
        currentBillableRateMinorPerHour: 10000n,
        estimatedProductivityGainBasisPoints: 2000,
        estimatedHoursSaved: '10',
        estimatedCapacityValueMinor: 100000n,
        methodologyVersion: 'test/v1',
        roundingPolicy: 'exact test fixture',
        disclaimerFR: 'Valeur non contractuelle',
        disclaimerEN: 'Non-contractual value',
      },
    });
  });

  afterAll(async () => prisma.$disconnect());

  it('serializes simultaneous retries and returns one finalized artifact', async () => {
    const key = `${fixture}-same-request`;
    const [first, second] = await Promise.all([
      service.generate(revisionId, 'FR', key, { userId: actorId }),
      service.generate(revisionId, 'FR', key, { userId: actorId }),
    ]);
    expect(first.id).toBe(second.id);
    expect(first.status).toBe('FINALIZED');
    expect(second.status).toBe('FINALIZED');
    await expect(
      prisma.proposalDocument.count({
        where: { generationKey: `${revisionId}:OFFER:FR:${key}` },
      }),
    ).resolves.toBe(1);
    expect(uploadPrivateImmutable).toHaveBeenCalledTimes(1);
  });

  it('renders complete FR and EN sections without a live provider', async () => {
    await service.generate(revisionId, 'EN', `${fixture}-en`, {
      userId: actorId,
    });
    const french = renderedHtml.find((html) =>
      html.includes('Proposition commerciale'),
    )!;
    const english = renderedHtml.find((html) =>
      html.includes('Commercial proposal'),
    )!;
    expect(french).toContain('Solution proposée');
    expect(french).toContain('PRIX');
    expect(french).toContain('Données déclarées');
    expect(french).toContain('Exclusivité');
    expect(french).toContain('Engagements');
    expect(french).toContain('VALEUR ESTIMÉE');
    expect(french).toContain('Conditions et acceptation');
    expect(french).toContain('CORO TEST ISSUER');
    expect(french).toContain('issuer@example.invalid');
    expect(french).toContain('2027-01-01');
    expect(french).toContain('2027-02-01');
    expect(french).toContain('Signature');
    expect(french).toContain('Date');
    expect(english).toContain('Proposed solution');
    expect(english).toContain('PRICE');
    expect(english).toContain('Declared data');
    expect(english).toContain('Exclusivity');
    expect(english).toContain('Commitments');
    expect(english).toContain('ESTIMATED VALUE');
    expect(english).toContain('Terms and acceptance');
    for (const html of [french, english]) {
      expect(html).not.toContain('DISTRIBUTABLE');
      expect(html).not.toContain('TBD');
      expect(html).not.toContain('catalogUnitAmountMinor');
      expect(html).not.toContain('commercialRuleCode');
      expect(html).not.toContain('justification');
      expect(html).not.toMatch(/>Marge<|>Margin</);
      expect(html).not.toMatch(/Contribution interne|Internal contribution/);
    }
  });
});
