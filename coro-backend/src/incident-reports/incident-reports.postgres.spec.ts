import { CoroActorType, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('INC-RP-01 PostgreSQL constraints', () => {
  beforeAll(async () => {
    await prisma.organization.createMany({
      data: [
        { id: 'rp-org-a', name: 'RP Org A' },
        { id: 'rp-org-b', name: 'RP Org B' },
      ],
      skipDuplicates: true,
    });
    await prisma.client.createMany({
      data: [
        {
          id: 'rp-client-a',
          name: 'RP Client A',
          regulatoryRequirements: [],
          organizationId: 'rp-org-a',
        },
        {
          id: 'rp-client-b',
          name: 'RP Client B',
          regulatoryRequirements: [],
          organizationId: 'rp-org-b',
        },
      ],
      skipDuplicates: true,
    });
    await prisma.building.createMany({
      data: [
        {
          id: 'rp-building-a',
          name: 'RP Building A',
          address: '1 Test',
          city: 'Montreal',
          province: 'QC',
          organizationId: 'rp-org-a',
          clientId: 'rp-client-a',
        },
        {
          id: 'rp-building-b',
          name: 'RP Building B',
          address: '2 Test',
          city: 'Montreal',
          province: 'QC',
          organizationId: 'rp-org-b',
          clientId: 'rp-client-b',
        },
      ],
      skipDuplicates: true,
    });
    await prisma.incidentReportTemplateVersion.create({
      data: {
        id: 'rp-template-a',
        organizationId: 'rp-org-a',
        templateKey: 'security',
        version: 1,
        name: 'Security',
        reportType: 'SECURITY',
        schemaVersion: '1',
        formSchema: {},
        fieldCatalog: {},
        contentHash: 'template-hash',
        createdByActorType: CoroActorType.SYSTEM,
        createdByActorId: 'system',
      },
    });
    await prisma.incidentReportRetentionPolicy.create({
      data: {
        id: 'rp-retention-a',
        organizationId: 'rp-org-a',
        reportType: 'SECURITY',
        retainForDays: 365,
        createdByActorType: CoroActorType.SYSTEM,
        createdByActorId: 'system',
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('accepts a same-tenant report and freezes its submitted content', async () => {
    await prisma.incidentReport.create({
      data: {
        id: 'rp-report-a',
        organizationId: 'rp-org-a',
        buildingId: 'rp-building-a',
        templateVersionId: 'rp-template-a',
        retentionPolicyId: 'rp-retention-a',
        reportNumber: 'RP-1',
        reportType: 'SECURITY',
        title: 'Synthetic report',
        createdByActorType: CoroActorType.SYSTEM,
        createdByActorId: 'system',
      },
    });
    await prisma.incidentReportVersion.create({
      data: {
        id: 'rp-version-a',
        organizationId: 'rp-org-a',
        reportId: 'rp-report-a',
        templateVersionId: 'rp-template-a',
        versionNumber: 1,
        content: { description: 'original' },
        provenanceManifest: {},
        contentHash: 'content-hash',
        immutableAt: new Date(),
        createdByActorType: CoroActorType.SYSTEM,
        createdByActorId: 'system',
      },
    });

    await expect(
      prisma.incidentReportVersion.update({
        where: { id: 'rp-version-a' },
        data: { content: { description: 'tampered' } },
      }),
    ).rejects.toThrow(/incident report version is immutable/i);
  });

  it('rejects a building from another organization', async () => {
    await expect(
      prisma.incidentReport.create({
        data: {
          organizationId: 'rp-org-a',
          buildingId: 'rp-building-b',
          templateVersionId: 'rp-template-a',
          retentionPolicyId: 'rp-retention-a',
          reportNumber: 'RP-CROSS-TENANT',
          reportType: 'SECURITY',
          title: 'Must fail',
          createdByActorType: CoroActorType.SYSTEM,
          createdByActorId: 'system',
        },
      }),
    ).rejects.toThrow();
  });
});
