import { BadRequestException } from '@nestjs/common';

const PARTS = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' } as const;

export function assertIanaTimeZone(timeZone: unknown): asserts timeZone is string {
  if (typeof timeZone !== 'string' || !timeZone.trim()) throw new BadRequestException('Fuseau horaire IANA requis');
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
  } catch {
    throw new BadRequestException('Fuseau horaire IANA invalide');
  }
}

function localParts(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, ...PARTS }).formatToParts(instant);
  const values = Object.fromEntries(parts.map(part => [part.type, Number(part.value)]));
  return { year: values.year, month: values.month, day: values.day, hour: values.hour, minute: values.minute, second: values.second };
}

export function buildingLocalToUtc(localDateTime: string, timeZone: string): Date {
  assertIanaTimeZone(timeZone);
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(localDateTime);
  if (!match) throw new BadRequestException('Date et heure locales requises (AAAA-MM-JJTHH:mm)');
  const [year, month, day, hour, minute, second] = [match[1], match[2], match[3], match[4], match[5], match[6] ?? '00'].map(Number);
  const target = { year, month, day, hour, minute, second };
  const civilUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  const valid = new Date(civilUtc);
  if (valid.getUTCFullYear() !== year || valid.getUTCMonth() + 1 !== month || valid.getUTCDate() !== day ||
      valid.getUTCHours() !== hour || valid.getUTCMinutes() !== minute || valid.getUTCSeconds() !== second) {
    throw new BadRequestException('Date et heure locales invalides');
  }
  const offsets = new Set<number>();
  for (const shift of [-36, -12, 12, 36]) {
    const sample = new Date(civilUtc + shift * 60 * 60 * 1000);
    const p = localParts(sample, timeZone);
    offsets.add(Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - sample.getTime());
  }
  const candidates = [...offsets].map(offset => new Date(civilUtc - offset)).filter(date => {
    const p = localParts(date, timeZone);
    return Object.keys(target).every(key => p[key as keyof typeof p] === target[key as keyof typeof target]);
  });
  if (candidates.length !== 1) {
    throw new BadRequestException(candidates.length ? 'Heure locale ambiguë au changement d’heure; choisissez une autre heure' : 'Heure locale inexistante au changement d’heure');
  }
  return candidates[0];
}

export function resolveBookingInstant(input: { iso?: Date; localDateTime?: string }, timeZone: string): Date {
  assertIanaTimeZone(timeZone);
  if (Boolean(input.iso) === Boolean(input.localDateTime)) {
    throw new BadRequestException('Fournissez une date ISO avec offset ou une date et heure locales');
  }
  if (input.localDateTime) return buildingLocalToUtc(input.localDateTime, timeZone);
  if (!input.iso || Number.isNaN(input.iso.getTime())) throw new BadRequestException('Date invalide');
  return input.iso;
}

export function formatBuildingDate(instant: Date, timeZone: string): string {
  assertIanaTimeZone(timeZone);
  return new Intl.DateTimeFormat('fr-CA', {
    timeZone, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(instant) + ` (${timeZone})`;
}
