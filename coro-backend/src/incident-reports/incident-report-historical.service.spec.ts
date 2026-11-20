import 'reflect-metadata';
import { IncidentReportHistoricalService } from './incident-report-historical.service';

describe('IncidentReportHistoricalService', () => {
  const prisma = {
    incidentReportHistoricalRecord: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
    },
  };
  const access = { require: jest.fn() };
  const service = new IncidentReportHistoricalService(
    prisma as never,
    access as never,
  );

  beforeEach(() => {
    process.env.INCIDENT_REPORTS_ENABLED = 'true';
    process.env.INCIDENT_REPORT_ARCHIVES_ENABLED = 'true';
    jest.clearAllMocks();
  });

  afterAll(() => {
    delete process.env.INCIDENT_REPORTS_ENABLED;
    delete process.env.INCIDENT_REPORT_ARCHIVES_ENABLED;
  });

  it('scopes archive search to the authorized organization and building', async () => {
    prisma.incidentReportHistoricalRecord.findMany.mockResolvedValue([
      {
        id: 'archive',
        sourceSystem: 'REPORTPERFECT',
        sourceObjectType: 'INCIDENT_REPORT',
        sourceObjectId: 'RP-1',
        sourceSchemaVersion: 'legacy',
        sourceHash: 'a'.repeat(64),
        mappedContent: { title: 'Synthetic archive' },
        provenanceManifest: {
          origin: 'HISTORICAL_IMPORT',
          nativeCoroApproval: false,
        },
        status: 'ACTIVE',
        importedAt: new Date(),
      },
    ]);
    prisma.incidentReportHistoricalRecord.count.mockResolvedValue(1);
    const result = await service.list(
      '00000000-0000-4000-8000-000000000001',
      {
        buildingId: '00000000-0000-4000-8000-000000000002',
        q: 'Synthetic',
        page: 1,
        pageSize: 25,
      },
      {} as never,
    );
    expect(access.require).toHaveBeenCalled();
    expect(prisma.incidentReportHistoricalRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: '00000000-0000-4000-8000-000000000001',
          buildingId: '00000000-0000-4000-8000-000000000002',
          status: 'ACTIVE',
        }),
      }),
    );
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        title: 'Synthetic archive',
        provenanceKind: 'HISTORICAL_IMPORT',
        nativeCoroApproval: false,
      }),
    );
  });

  it('never resolves a record outside the requested organization', async () => {
    prisma.incidentReportHistoricalRecord.findFirst.mockResolvedValue(null);
    await expect(
      service.get('other-org', 'archive', {} as never),
    ).rejects.toThrow('Archive historique introuvable');
    expect(access.require).not.toHaveBeenCalled();
  });
});
