import 'reflect-metadata';
import { NotFoundException } from '@nestjs/common';
import { IncidentReportImportExecutionService } from './incident-report-import-execution.service';

describe('IncidentReportImportExecutionService', () => {
  const prisma = {
    incidentReportImportItem: { groupBy: jest.fn() },
    incidentReportHistoricalRecord: { count: jest.fn() },
  };
  const service = new IncidentReportImportExecutionService(
    prisma as never,
    {} as never,
    {} as never,
    {} as never,
  );

  it('derives stable source identities without inventing native approval', () => {
    expect(
      (service as any).sourceObjectId({ legacy_id: ' RP-42 ' }, 'abc'),
    ).toBe('RP-42');
    expect((service as any).sourceObjectId({ value: 'x' }, 'abc')).toBe(
      'sha256:abc',
    );
  });

  it('reconciles cursor, imported rows and duplicate/conflict counters', async () => {
    prisma.incidentReportImportItem.groupBy.mockResolvedValue([
      { status: 'IMPORTED', _count: { _all: 2 } },
      { status: 'DUPLICATE', _count: { _all: 1 } },
      { status: 'CONFLICT', _count: { _all: 1 } },
    ]);
    prisma.incidentReportHistoricalRecord.count.mockResolvedValue(2);
    const result = await (service as any).reconcileInternal('org', 'run', {
      cursor: 4,
      importedCount: 2,
      duplicateCount: 1,
      conflictCount: 1,
      failedCount: 0,
    });
    expect(result.consistent).toBe(true);
  });

  it('fails closed before persistence when import is disabled', async () => {
    delete process.env.INCIDENT_REPORT_IMPORT_ENABLED;
    await expect(service.get('org', 'run', {} as never)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
