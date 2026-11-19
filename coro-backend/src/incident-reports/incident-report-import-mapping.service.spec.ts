import 'reflect-metadata';
import { IncidentReportImportMappingService } from './incident-report-import-mapping.service';

describe('IncidentReportImportMappingService', () => {
  const service = new IncidentReportImportMappingService(
    {} as never,
    {} as never,
    {} as never,
  );

  it('maps typed values and reports row-level conflicts without source values', () => {
    const result = service.mapRecords(
      ['legacy_id', 'occurred_at', 'amount'],
      [
        { legacy_id: ' RP-1 ', occurred_at: '2026-11-19', amount: '12.50' },
        { legacy_id: '', occurred_at: 'invalid', amount: 'x' },
      ],
      [
        {
          sourceHeader: 'legacy_id',
          canonicalField: 'legacy.source_id',
          transform: 'TRIM',
          required: true,
        },
        {
          sourceHeader: 'occurred_at',
          canonicalField: 'incident.occurred_at',
          transform: 'DATE_ISO',
          required: true,
        },
        {
          sourceHeader: 'amount',
          canonicalField: 'loss.amount',
          transform: 'NUMBER',
          required: false,
        },
      ],
    );
    expect(result.validRecords).toBe(1);
    expect(result.samples[0].mapped['legacy.source_id']).toBe('RP-1');
    expect(result.samples[0].mapped['loss.amount']).toBe(12.5);
    expect(result.conflicts.map((conflict) => conflict.code)).toEqual([
      'REQUIRED_VALUE_MISSING',
      'TRANSFORM_FAILED',
      'TRANSFORM_FAILED',
    ]);
    expect(JSON.stringify(result.conflicts)).not.toContain('invalid');
  });

  it('reports missing source headers as structural conflicts', () => {
    const result = service.mapRecords(
      ['known'],
      [{ known: 'value' }],
      [
        {
          sourceHeader: 'missing',
          canonicalField: 'legacy.missing',
          transform: 'NONE',
          required: false,
        },
      ],
    );
    expect(result.conflicts).toContainEqual(
      expect.objectContaining({ row: null, code: 'SOURCE_HEADER_MISSING' }),
    );
  });
});
