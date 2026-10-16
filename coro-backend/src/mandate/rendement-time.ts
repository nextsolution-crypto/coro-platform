import { BadRequestException } from '@nestjs/common';

export const REPORTING_TIME_ZONE = 'America/Toronto';

export function assertCivilDate(value: string, field: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new BadRequestException(`${field} doit être une date YYYY-MM-DD.`);
  const [year, month, day] = value.split('-').map(Number);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  )
    throw new BadRequestException(`${field} est invalide.`);
  return value;
}

export function nextCivilDate(value: string): string {
  const valid = assertCivilDate(value, 'date');
  const [year, month, day] = valid.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return next.toISOString().slice(0, 10);
}

function localParts(at: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour'),
    minute: value('minute'),
    second: value('second'),
  };
}

export function startOfCivilDay(
  value: string,
  timeZone = REPORTING_TIME_ZONE,
): Date {
  const valid = assertCivilDate(value, 'date');
  const [year, month, day] = valid.split('-').map(Number);
  const desired = Date.UTC(year, month - 1, day, 0, 0, 0);
  let instant = desired;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const observed = localParts(new Date(instant), timeZone);
    const observedAsUtc = Date.UTC(
      observed.year,
      observed.month - 1,
      observed.day,
      observed.hour,
      observed.minute,
      observed.second,
    );
    instant += desired - observedAsUtc;
  }
  return new Date(instant);
}

export function reportingRange(from?: string, to?: string) {
  if (!from && !to) return undefined;
  if (!from || !to)
    throw new BadRequestException(
      'Les dates from et to sont requises ensemble.',
    );
  const start = assertCivilDate(from, 'from');
  const end = assertCivilDate(to, 'to');
  if (end < start)
    throw new BadRequestException('to doit être égale ou postérieure à from.');
  return {
    gte: startOfCivilDay(start),
    lt: startOfCivilDay(nextCivilDate(end)),
  };
}

export function civilDateInToronto(value: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: REPORTING_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);
}
