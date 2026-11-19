import 'reflect-metadata';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { IncidentReportImportService } from './incident-report-import.service';
import { incidentReportImportEnabled } from './incident-reports.config';

describe('IncidentReportImportService staging', () => {
  const service = new IncidentReportImportService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

  it('is disabled unless both report and import flags are exactly true', () => {
    expect(incidentReportImportEnabled({} as NodeJS.ProcessEnv)).toBe(false);
    expect(
      incidentReportImportEnabled({
        INCIDENT_REPORTS_ENABLED: 'true',
        INCIDENT_REPORT_IMPORT_ENABLED: 'TRUE',
      } as NodeJS.ProcessEnv),
    ).toBe(false);
    expect(
      incidentReportImportEnabled({
        INCIDENT_REPORTS_ENABLED: 'true',
        INCIDENT_REPORT_IMPORT_ENABLED: 'true',
      } as NodeJS.ProcessEnv),
    ).toBe(true);
  });

  it('refuses access before touching dependencies when disabled', async () => {
    delete process.env.INCIDENT_REPORT_IMPORT_ENABLED;
    await expect(
      service.createBatch(
        '00000000-0000-4000-8000-000000000001',
        {
          buildingId: '00000000-0000-4000-8000-000000000002',
          sourceSystem: 'REPORTPERFECT',
          idempotencyKey: '00000000-0000-4000-8000-000000000003',
        },
        {} as never,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('analyzes quoted CSV without retaining source values', () => {
    const result = (service as any).analyzeBytes(
      Buffer.from('id,note\r\n1,"alarme, niveau 2"\r\n2,ok\r\n'),
      'text/csv',
    );
    expect(result).toEqual({
      headers: ['id', 'note'],
      recordCount: 2,
      emptyRows: 0,
    });
    expect(JSON.stringify(result)).not.toContain('alarme');
  });

  it('rejects duplicate headers and binary input', () => {
    expect(() =>
      (service as any).analyzeBytes(Buffer.from('id,id\n1,2'), 'text/csv'),
    ).toThrow(BadRequestException);
    expect(() =>
      (service as any).assertSignature(
        Buffer.from([0, 1, 2]),
        'application/json',
      ),
    ).toThrow(BadRequestException);
    expect(() => (service as any).decodeBase64('not-base64!')).toThrow(
      BadRequestException,
    );
  });

  it('requires a JSON array of flat records and retains headers only', () => {
    const result = (service as any).analyzeBytes(
      Buffer.from('[{"legacy_id":"RP-1","category":"SECURITY"}]'),
      'application/json',
    );
    expect(result.headers).toEqual(['legacy_id', 'category']);
    expect(result.recordCount).toBe(1);
    expect(JSON.stringify(result)).not.toContain('RP-1');
  });
});
