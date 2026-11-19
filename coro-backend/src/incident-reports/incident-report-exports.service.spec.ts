import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AdviserActor } from '../auth/project-access';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { IncidentReportAccessService } from './incident-report-access.service';
import { IncidentReportExportsService } from './incident-report-exports.service';

describe('IncidentReportExportsService', () => {
  const actor = { userId: 'actor-a', organizationId: 'org-a' } as AdviserActor;
  const report = {
    id: 'report-a',
    organizationId: 'org-a',
    buildingId: 'building-a',
    incidentEventId: null,
    reportNumber: 'IR-001',
    title: 'Rapport synthetique',
    templateVersionId: 'template-a',
    building: {
      id: 'building-a',
      name: 'Batiment fictif',
      timeZone: 'America/Toronto',
      timeZoneVerified: true,
    },
    templateVersion: {
      contentHash: 'template-hash',
      formSchema: {
        schemaVersion: '1.0',
        sections: [
          {
            key: 'main',
            title: 'Details',
            fields: [{ key: 'summary', label: 'Resume', type: 'LONG_TEXT' }],
          },
        ],
      },
    },
    versions: [
      {
        id: 'version-a',
        versionNumber: 1,
        immutableAt: new Date(),
        status: 'APPROVED',
        contentHash: 'content-hash',
        content: { summary: 'Aucune donnee reelle.' },
      },
    ],
    approvals: [
      {
        id: 'approval-a',
        decision: 'APPROVED',
        actorType: 'CLIENT_USER',
        actorId: 'reviewer-a',
        actorRoleSnapshot: 'SUPERVISOR',
        decidedAt: new Date('2026-12-15T12:00:00Z'),
      },
    ],
  };
  const exportRow = {
    id: 'export-a',
    organizationId: 'org-a',
    reportId: 'report-a',
    reportVersionId: 'version-a',
    format: 'PDF',
    pageFormat: 'LETTER',
    locale: 'fr-CA',
    status: 'COMPLETED',
    storageKey:
      'tenant-org-a/incident-report-exports/report-a/version-a/export-a.pdf',
    sha256: 'hash',
    rendererVersion: 'renderer',
    requestIdempotencyKey: '00000000-0000-4000-8000-000000000001',
    sourceManifest: {},
    failureCode: null,
    createdByActorType: 'USER',
    createdByActorId: 'actor-a',
    createdAt: new Date(),
    completedAt: new Date(),
  };
  const prisma: any = {
    coroActorIdentity: { upsert: jest.fn() },
    incidentReport: { findFirst: jest.fn() },
    incidentReportExport: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    incidentReportAuditEvent: { create: jest.fn() },
    user: { findFirst: jest.fn() },
    clientUser: { findFirst: jest.fn() },
    $transaction: jest.fn(async (work: (tx: any) => unknown) => work(prisma)),
  };
  const storage = {
    uploadPrivateImmutable: jest.fn(),
    downloadPrivate: jest.fn(),
  };
  const access = { require: jest.fn() };
  const service = new IncidentReportExportsService(
    prisma as PrismaService,
    storage as unknown as StorageService,
    access as unknown as IncidentReportAccessService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.INCIDENT_REPORTS_ENABLED = 'true';
    prisma.incidentReport.findFirst.mockResolvedValue(report);
    prisma.incidentReportExport.findUnique.mockResolvedValue(null);
    prisma.incidentReportExport.create.mockResolvedValue({});
    prisma.incidentReportExport.update.mockResolvedValue(exportRow);
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.clientUser.findFirst.mockResolvedValue({
      firstName: 'Marie-Eve',
      lastName: 'Premont',
    });
    (service as any).renderer.render = jest
      .fn()
      .mockResolvedValue(Buffer.from('%PDF-test'));
    storage.uploadPrivateImmutable.mockResolvedValue({
      storageKey: exportRow.storageKey,
    });
  });
  afterAll(() => delete process.env.INCIDENT_REPORTS_ENABLED);

  it('refuses a mutable draft before writing storage', async () => {
    prisma.incidentReport.findFirst.mockResolvedValue({
      ...report,
      versions: [{ ...report.versions[0], immutableAt: null, status: 'DRAFT' }],
    });
    await expect(
      service.create(
        'org-a',
        'report-a',
        {
          reportVersionId: 'version-a',
          pageFormat: 'LETTER',
          locale: 'fr-CA',
          idempotencyKey: '00000000-0000-4000-8000-000000000001',
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(storage.uploadPrivateImmutable).not.toHaveBeenCalled();
  });

  it('replays an idempotent export without a second render or storage write', async () => {
    prisma.incidentReportExport.findUnique.mockResolvedValue(exportRow);
    const result = await service.create(
      'org-a',
      'report-a',
      {
        reportVersionId: 'version-a',
        pageFormat: 'LETTER',
        locale: 'fr-CA',
        idempotencyKey: exportRow.requestIdempotencyKey,
      },
      actor,
    );
    expect(result).not.toHaveProperty('storageKey');
    expect(storage.uploadPrivateImmutable).not.toHaveBeenCalled();
  });

  it('recovers a concurrent idempotency collision without duplicate storage', async () => {
    prisma.incidentReportExport.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(exportRow);
    prisma.incidentReportExport.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: '6.19.3',
      }),
    );
    const result = await service.create(
      'org-a',
      'report-a',
      {
        reportVersionId: 'version-a',
        pageFormat: 'LETTER',
        locale: 'fr-CA',
        idempotencyKey: exportRow.requestIdempotencyKey,
      },
      actor,
    );
    expect(result).not.toHaveProperty('storageKey');
    expect(storage.uploadPrivateImmutable).not.toHaveBeenCalled();
  });

  it('renders with the verified building time zone and an honestly resolved actor name', async () => {
    await service.create(
      'org-a',
      'report-a',
      {
        reportVersionId: 'version-a',
        pageFormat: 'LETTER',
        locale: 'fr-CA',
        idempotencyKey: exportRow.requestIdempotencyKey,
      },
      actor,
    );

    expect((service as any).renderer.render).toHaveBeenCalledWith(
      expect.objectContaining({
        timeZone: 'America/Toronto',
        approvals: [
          expect.objectContaining({
            actorDisplayName: 'Marie-Eve Premont',
            actorDisplayNameSource: 'CURRENT_PROFILE',
            actorId: 'reviewer-a',
          }),
        ],
      }),
    );
    expect(prisma.incidentReportExport.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sourceManifest: expect.objectContaining({
          approvalActors: [
            expect.objectContaining({
              actorId: 'reviewer-a',
              actorDisplayName: 'Marie-Eve Premont',
              actorDisplayNameSource: 'CURRENT_PROFILE',
            }),
          ],
        }),
      }),
    });
  });

  it('refuses a downloaded object whose digest no longer matches', async () => {
    prisma.incidentReport.findFirst.mockResolvedValue({
      buildingId: 'building-a',
      incidentEventId: null,
    });
    prisma.incidentReportExport.findFirst.mockResolvedValue({
      ...exportRow,
      sha256: '0'.repeat(64),
    });
    storage.downloadPrivate.mockResolvedValue(Buffer.from('altered'));
    await expect(
      service.download('org-a', 'report-a', 'export-a', actor),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.incidentReportAuditEvent.create).not.toHaveBeenCalled();
  });
});
