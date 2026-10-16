import { BadRequestException } from '@nestjs/common';
import {
  civilDateInToronto,
  nextCivilDate,
  reportingRange,
  startOfCivilDay,
} from './rendement-time';

describe('Rendement Toronto civil time', () => {
  it('uses an exclusive upper bound while including the complete last day', () => {
    const range = reportingRange('2026-01-31', '2026-01-31');

    expect(range?.gte.toISOString()).toBe('2026-01-31T05:00:00.000Z');
    expect(range?.lt.toISOString()).toBe('2026-02-01T05:00:00.000Z');
    expect(nextCivilDate('2028-02-29')).toBe('2028-03-01');
  });

  it('respects the spring and fall DST day lengths in America/Toronto', () => {
    const spring =
      startOfCivilDay('2026-03-09').getTime() -
      startOfCivilDay('2026-03-08').getTime();
    const fall =
      startOfCivilDay('2026-11-02').getTime() -
      startOfCivilDay('2026-11-01').getTime();

    expect(spring).toBe(23 * 60 * 60 * 1000);
    expect(fall).toBe(25 * 60 * 60 * 1000);
  });

  it('maps instants to the Toronto civil date', () => {
    expect(civilDateInToronto(new Date('2026-01-01T04:59:59.999Z'))).toBe(
      '2025-12-31',
    );
    expect(civilDateInToronto(new Date('2026-01-01T05:00:00.000Z'))).toBe(
      '2026-01-01',
    );
  });

  it('rejects incomplete, invalid, and reversed periods', () => {
    expect(() => reportingRange('2026-01-01', undefined)).toThrow(
      BadRequestException,
    );
    expect(() => reportingRange('2026-02-30', '2026-03-01')).toThrow(
      BadRequestException,
    );
    expect(() => reportingRange('2026-02-02', '2026-02-01')).toThrow(
      BadRequestException,
    );
  });
});
