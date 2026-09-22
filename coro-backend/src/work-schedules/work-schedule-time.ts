import { BadRequestException } from '@nestjs/common';
import { assertIanaTimeZone, buildingLocalToUtc } from '../bookings/booking-time';

export type WorkSlot = { dayOfWeek: number; startTime: number; endTime: number };
export type UtcRange = { startUtc: Date; endUtc: Date };
export type ScheduleVersionRange = { effectiveFrom: Date; effectiveUntil: Date | null };

// Half-open intervals: touching boundaries are allowed; null is +infinity.
export function scheduleVersionsOverlap(a: ScheduleVersionRange, b: ScheduleVersionRange): boolean {
  return a.effectiveFrom.getTime() < (b.effectiveUntil?.getTime() ?? Infinity) &&
    b.effectiveFrom.getTime() < (a.effectiveUntil?.getTime() ?? Infinity);
}

export function assertNonOverlappingScheduleVersions(versions: ScheduleVersionRange[]): void {
  for (const version of versions) {
    if (!Number.isFinite(version.effectiveFrom.getTime()) ||
      (version.effectiveUntil && (!Number.isFinite(version.effectiveUntil.getTime()) || version.effectiveUntil <= version.effectiveFrom))) {
      throw new BadRequestException('Période d’horaire invalide');
    }
  }
  for (let i = 0; i < versions.length; i++) {
    for (let j = i + 1; j < versions.length; j++) {
      if (scheduleVersionsOverlap(versions[i], versions[j])) throw new BadRequestException('Versions d’horaire chevauchantes');
    }
  }
}

export function parseCivilDate(value: string): Date {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BadRequestException('Date civile invalide');
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new BadRequestException('Date civile invalide');
  return date;
}

export function civilString(date: Date): string { return date.toISOString().slice(0, 10); }
export function nextCivilDate(value: string): string {
  const date = parseCivilDate(value);
  date.setUTCDate(date.getUTCDate() + 1);
  return civilString(date);
}

export function normalizeSlots(input: WorkSlot[]): WorkSlot[] {
  if (!Array.isArray(input) || input.length > 42) throw new BadRequestException('Plages invalides');
  const sorted = input.map(slot => {
    if (!slot || !Number.isInteger(slot.dayOfWeek) || slot.dayOfWeek < 0 || slot.dayOfWeek > 6 ||
      !Number.isInteger(slot.startTime) || !Number.isInteger(slot.endTime) ||
      slot.startTime < 0 || slot.startTime >= slot.endTime || slot.endTime > 1440) {
      throw new BadRequestException('Plage invalide; séparez les plages traversant minuit');
    }
    return { dayOfWeek: slot.dayOfWeek, startTime: slot.startTime, endTime: slot.endTime };
  }).sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime - b.startTime);
  const result: WorkSlot[] = [];
  for (const slot of sorted) {
    const previous = result.at(-1);
    if (previous?.dayOfWeek === slot.dayOfWeek) {
      if (slot.startTime < previous.endTime) throw new BadRequestException('Plages horaires chevauchantes');
      if (slot.startTime === previous.endTime) { previous.endTime = slot.endTime; continue; }
    }
    result.push({ ...slot });
  }
  return result;
}

export function localDate(instant: Date, timeZone: string): string {
  assertIanaTimeZone(timeZone);
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(instant);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function localMidnight(date: string, timeZone: string): Date {
  return buildingLocalToUtc(`${date}T00:00`, timeZone);
}

function slotBoundary(date: string, minute: number, timeZone: string): Date {
  if (minute === 1440) return localMidnight(nextCivilDate(date), timeZone);
  return buildingLocalToUtc(`${date}T${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`, timeZone);
}

export function scheduleRanges(slots: WorkSlot[], timeZone: string, startUtc: Date, endUtc: Date, validStart: Date, validEnd?: Date | null): { validity: UtcRange; work: UtcRange[] } {
  assertIanaTimeZone(timeZone);
  const validity = { startUtc: new Date(Math.max(startUtc.getTime(), validStart.getTime())), endUtc: new Date(Math.min(endUtc.getTime(), validEnd?.getTime() ?? 8640000000000000)) };
  const work: UtcRange[] = [];
  const first = parseCivilDate(localDate(startUtc, timeZone));
  const last = parseCivilDate(localDate(new Date(endUtc.getTime() - 1), timeZone));
  for (let day = first; day <= last; day = new Date(day.getTime() + 86400000)) {
    const date = civilString(day);
    for (const slot of slots.filter(item => item.dayOfWeek === day.getUTCDay())) {
      const start = slotBoundary(date, slot.startTime, timeZone);
      const end = slotBoundary(date, slot.endTime, timeZone);
      if (end > start && end > validity.startUtc && start < validity.endUtc) work.push({
        startUtc: new Date(Math.max(start.getTime(), validity.startUtc.getTime())),
        endUtc: new Date(Math.min(end.getTime(), validity.endUtc.getTime())),
      });
    }
  }
  return { validity, work };
}

export function uncovered(target: UtcRange, ranges: UtcRange[]): UtcRange[] {
  const gaps: UtcRange[] = [];
  let cursor = target.startUtc.getTime();
  for (const range of [...ranges].sort((a, b) => a.startUtc.getTime() - b.startUtc.getTime())) {
    if (range.endUtc.getTime() <= cursor) continue;
    if (range.startUtc.getTime() > cursor) gaps.push({ startUtc: new Date(cursor), endUtc: new Date(Math.min(range.startUtc.getTime(), target.endUtc.getTime())) });
    cursor = Math.min(target.endUtc.getTime(), Math.max(cursor, range.endUtc.getTime()));
    if (cursor >= target.endUtc.getTime()) break;
  }
  if (cursor < target.endUtc.getTime()) gaps.push({ startUtc: new Date(cursor), endUtc: target.endUtc });
  return gaps.filter(gap => gap.endUtc > gap.startUtc);
}
