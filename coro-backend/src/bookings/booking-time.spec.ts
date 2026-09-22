import { BadRequestException } from '@nestjs/common';
import { buildingLocalToUtc, formatBuildingDate, resolveBookingInstant } from './booking-time';

describe('building booking time', () => {
  it.each([
    ['America/Toronto', '2026-07-15T09:00', '2026-07-15T13:00:00.000Z'],
    ['America/Toronto', '2026-01-15T09:00', '2026-01-15T14:00:00.000Z'],
    ['America/Vancouver', '2026-07-15T09:00', '2026-07-15T16:00:00.000Z'],
  ])('resolves %s %s to UTC', (zone, local, expected) => {
    expect(buildingLocalToUtc(local, zone).toISOString()).toBe(expected);
  });

  it.each(['2026-03-08T02:30', '2026-11-01T01:30'])('rejects DST gap or overlap %s', local => {
    expect(() => buildingLocalToUtc(local, 'America/Toronto')).toThrow(BadRequestException);
  });

  it('preserves legacy ISO instants and displays in the building zone', () => {
    const instant = new Date('2026-07-15T13:00:00.000Z');
    expect(resolveBookingInstant({ iso: instant }, 'America/Toronto')).toBe(instant);
    expect(formatBuildingDate(instant, 'America/Toronto')).toContain('09');
  });

  it('rejects invalid zone and conflicting date inputs', () => {
    expect(() => buildingLocalToUtc('2026-07-15T09:00', 'Mars/Olympus')).toThrow(BadRequestException);
    expect(() => resolveBookingInstant({ iso: new Date(), localDateTime: '2026-07-15T09:00' }, 'America/Toronto')).toThrow(BadRequestException);
  });
});
