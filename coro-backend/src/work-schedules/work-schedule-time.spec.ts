import { BadRequestException } from '@nestjs/common';
import { assertNonOverlappingScheduleVersions, civilString, localMidnight, nextCivilDate, normalizeSlots, scheduleRanges, scheduleVersionsOverlap, uncovered } from './work-schedule-time';

describe('work schedule local intervals', () => {
  it('uses half-open version ranges with null as infinity', () => {
    const first = { effectiveFrom: new Date('2026-01-01'), effectiveUntil: new Date('2026-06-01') };
    const adjacent = { effectiveFrom: new Date('2026-06-01'), effectiveUntil: null };
    const overlapping = { effectiveFrom: new Date('2026-05-31'), effectiveUntil: null };
    expect(scheduleVersionsOverlap(first, adjacent)).toBe(false);
    expect(scheduleVersionsOverlap(first, overlapping)).toBe(true);
    expect(() => assertNonOverlappingScheduleVersions([first, adjacent])).not.toThrow();
    expect(() => assertNonOverlappingScheduleVersions([first, overlapping])).toThrow(BadRequestException);
    expect(() => assertNonOverlappingScheduleVersions([adjacent, { effectiveFrom: new Date('2026-07-01'), effectiveUntil: null }])).toThrow(BadRequestException);
  });
  it('merges adjacent intervals and rejects overlap or overnight ambiguity', () => {
    expect(normalizeSlots([{ dayOfWeek: 1, startTime: 480, endTime: 720 }, { dayOfWeek: 1, startTime: 720, endTime: 1020 }]))
      .toEqual([{ dayOfWeek: 1, startTime: 480, endTime: 1020 }]);
    expect(() => normalizeSlots([{ dayOfWeek: 1, startTime: 480, endTime: 720 }, { dayOfWeek: 1, startTime: 700, endTime: 900 }]))
      .toThrow(BadRequestException);
    expect(() => normalizeSlots([{ dayOfWeek: 1, startTime: 1320, endTime: 360 }])).toThrow(BadRequestException);
  });

  it('measures an all-day absence by local midnights across DST', () => {
    const spring = localMidnight('2026-03-08', 'America/Toronto');
    const springEnd = localMidnight(nextCivilDate('2026-03-08'), 'America/Toronto');
    expect((springEnd.getTime() - spring.getTime()) / 3600000).toBe(23);
    const fall = localMidnight('2026-11-01', 'America/Toronto');
    const fallEnd = localMidnight(nextCivilDate('2026-11-01'), 'America/Toronto');
    expect((fallEnd.getTime() - fall.getTime()) / 3600000).toBe(25);
  });

  it('compares Montreal work time to a Vancouver Booking via UTC', () => {
    const target = { startUtc: new Date('2026-07-15T16:00:00Z'), endUtc: new Date('2026-07-15T19:00:00Z') };
    const ranges = scheduleRanges([{ dayOfWeek: 3, startTime: 480, endTime: 990 }], 'America/Toronto',
      target.startUtc, target.endUtc, new Date('2026-01-01'));
    expect(uncovered(target, ranges.work)).toEqual([]);
    expect(civilString(new Date('2026-07-15'))).toBe('2026-07-15');
  });

  it('recognizes a gap across local days', () => {
    const target = { startUtc: new Date('2026-10-02T03:00:00Z'), endUtc: new Date('2026-10-02T05:00:00Z') };
    const ranges = scheduleRanges([{ dayOfWeek: 4, startTime: 0, endTime: 360 }], 'America/Toronto',
      target.startUtc, target.endUtc, new Date('2026-01-01'));
    expect(uncovered(target, ranges.work).length).toBeGreaterThan(0);
  });

  it('does not interpret an unrelated DST transition day', () => {
    const target = { startUtc: new Date('2026-11-02T14:00:00Z'), endUtc: new Date('2026-11-02T15:00:00Z') };
    const ranges = scheduleRanges([
      { dayOfWeek: 0, startTime: 90, endTime: 150 },
      { dayOfWeek: 1, startTime: 480, endTime: 1020 },
    ], 'America/Toronto', target.startUtc, target.endUtc, new Date('2026-01-01'));
    expect(uncovered(target, ranges.work)).toEqual([]);
  });
});
