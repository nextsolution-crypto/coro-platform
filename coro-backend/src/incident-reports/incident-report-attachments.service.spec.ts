import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { AdviserActor } from '../auth/project-access';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { IncidentReportAccessService } from './incident-report-access.service';
import { IncidentReportAttachmentScanner } from './incident-report-attachment-scanner.service';
import { IncidentReportAttachmentsService } from './incident-report-attachments.service';

describe('IncidentReportAttachmentsService feature flag', () => {
  const actor = { userId: 'actor', organizationId: 'org' } as AdviserActor;
  const prisma = {
    incidentReport: { findFirst: jest.fn() },
    incidentReportAttachment: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  };
  const storage = {
    uploadPrivateImmutable: jest.fn(),
    downloadPrivate: jest.fn(),
  };
  const scanner = { scan: jest.fn() };
  const access = { require: jest.fn() };
  const service = () =>
    new IncidentReportAttachmentsService(
      prisma as unknown as PrismaService,
      storage as unknown as StorageService,
      scanner as unknown as IncidentReportAttachmentScanner,
      access as unknown as IncidentReportAccessService,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.INCIDENT_REPORTS_ENABLED = 'false';
  });

  afterAll(() => {
    delete process.env.INCIDENT_REPORTS_ENABLED;
    delete process.env.INCIDENT_REPORT_ATTACHMENTS_ENABLED;
  });

  it.each([
    ['create', () => service().create('org', 'report', {} as never, actor)],
    [
      'download',
      () => service().download('org', 'report', 'attachment', actor),
    ],
    [
      'revoke',
      () => service().revoke('org', 'report', 'attachment', {} as never, actor),
    ],
  ])('blocks %s before data or storage access', async (_name, operation) => {
    await expect(operation()).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.incidentReport.findFirst).not.toHaveBeenCalled();
    expect(prisma.incidentReportAttachment.findFirst).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(storage.uploadPrivateImmutable).not.toHaveBeenCalled();
    expect(storage.downloadPrivate).not.toHaveBeenCalled();
    expect(scanner.scan).not.toHaveBeenCalled();
    expect(access.require).not.toHaveBeenCalled();
  });

  it('fails closed before reading or persisting a new file when antivirus-backed uploads are disabled', async () => {
    process.env.INCIDENT_REPORTS_ENABLED = 'true';
    process.env.INCIDENT_REPORT_ATTACHMENTS_ENABLED = 'false';

    await expect(
      service().create('org', 'report', {} as never, actor),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(prisma.incidentReport.findFirst).not.toHaveBeenCalled();
    expect(storage.uploadPrivateImmutable).not.toHaveBeenCalled();
    expect(scanner.scan).not.toHaveBeenCalled();
    expect(access.require).not.toHaveBeenCalled();
  });

  it('keeps a previously CLEAN private attachment readable under current RBAC', async () => {
    process.env.INCIDENT_REPORTS_ENABLED = 'true';
    process.env.INCIDENT_REPORT_ATTACHMENTS_ENABLED = 'false';
    prisma.incidentReportAttachment.findFirst.mockResolvedValue({
      storageKey: 'private/key',
      mediaType: 'application/pdf',
      originalFileName: 'evidence.pdf',
      report: { buildingId: 'building-a' },
    });
    storage.downloadPrivate.mockResolvedValue(Buffer.from('safe-existing'));

    const result = await service().download(
      'org',
      'report',
      'attachment',
      actor,
    );

    expect(prisma.incidentReportAttachment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ scanStatus: 'CLEAN', revokedAt: null }),
      }),
    );
    expect(access.require).toHaveBeenCalled();
    expect(result.bytes.toString()).toBe('safe-existing');
    expect(scanner.scan).not.toHaveBeenCalled();
  });
});
