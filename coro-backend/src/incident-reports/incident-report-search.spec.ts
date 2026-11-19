import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { IncidentReportListQueryDto } from './dto/incident-report.dto';

describe('Incident report canonical search contract', () => {
  it('accepts bounded canonical filters and ISO date ranges', () => {
    const dto = plainToInstance(IncidentReportListQueryDto, {
      buildingId: '00000000-0000-4000-8000-000000000001',
      reportType: 'FIRE_ALARM',
      q: '  alarm  ',
      createdFrom: '2024-01-01T00:00:00.000Z',
      createdTo: '2026-12-31T23:59:59.999Z',
      page: '1',
      pageSize: '50',
    });
    expect(validateSync(dto)).toEqual([]);
    expect(dto.q).toBe('alarm');
    expect(dto.pageSize).toBe(50);
  });

  it('rejects malformed dates, unbounded pages, and non-UUID buildings', () => {
    const dto = plainToInstance(IncidentReportListQueryDto, {
      buildingId: 'legacy-building',
      createdFrom: 'yesterday',
      pageSize: '1000',
    });
    expect(validateSync(dto).map((error) => error.property)).toEqual(
      expect.arrayContaining(['buildingId', 'createdFrom', 'pageSize']),
    );
  });
});
