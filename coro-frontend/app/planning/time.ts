export type PlannerView = 'day' | 'week' | 'workweek' | 'month';
const formatterCache = new Map<string, Intl.DateTimeFormat>();
const boundaryCache = new Map<string, Date>();

function zoneFormatter(timeZone: string) {
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    formatterCache.set(timeZone, formatter);
  }
  return formatter;
}

export function validTimeZone(value: string): boolean {
  try { new Intl.DateTimeFormat('fr-CA', { timeZone: value }); return true; }
  catch { return false; }
}

function parts(instant: Date, timeZone: string) {
  const data = Object.fromEntries(zoneFormatter(timeZone).formatToParts(instant).map(part => [part.type, part.value]));
  return { year: Number(data.year), month: Number(data.month), day: Number(data.day),
    hour: Number(data.hour), minute: Number(data.minute) };
}

export function dateKey(instant: Date, timeZone: string): string {
  const p = parts(instant, timeZone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

export function localMinutes(instant: Date, timeZone: string): number {
  const p = parts(instant, timeZone);
  return p.hour * 60 + p.minute;
}

export function addDays(key: string, count: number): string {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

export function monday(key: string): string {
  const weekday = new Date(`${key}T12:00:00Z`).getUTCDay();
  return addDays(key, -(weekday === 0 ? 6 : weekday - 1));
}

export function viewDays(key: string, view: PlannerView): string[] {
  if (view === 'day') return [key];
  if (view === 'month') {
    const first = `${key.slice(0, 7)}-01`;
    const next = addMonths(first, 1);
    const count = Math.round((new Date(`${next}T12:00:00Z`).getTime() - new Date(`${first}T12:00:00Z`).getTime()) / 86_400_000);
    return Array.from({ length: count }, (_, index) => addDays(first, index));
  }
  const first = monday(key);
  return Array.from({ length: view === 'week' ? 7 : 5 }, (_, index) => addDays(first, index));
}

export function monthGridDays(key: string): string[] {
  const month = viewDays(key, 'month');
  const first = monday(month[0]);
  const count = Math.max(35, Math.ceil((month.length + Math.round((new Date(`${month[0]}T12:00:00Z`).getTime() -
    new Date(`${first}T12:00:00Z`).getTime()) / 86_400_000)) / 7) * 7);
  return Array.from({ length: count }, (_, index) => addDays(first, index));
}

export function addMonths(key: string, count: number): string {
  const [year, month, day] = key.split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1 + count, 1, 12));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0, 12)).getUTCDate();
  return `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
}

export function moveDate(key: string, view: PlannerView, direction: -1 | 1): string {
  return view === 'month' ? addMonths(key, direction) : addDays(key, direction * (view === 'day' ? 1 : 7));
}

export function periodLabel(days: string[], view: PlannerView): string {
  if (!days.length) return '';
  const full = (key: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('fr-CA',
    { ...options, timeZone: 'UTC' }).format(new Date(`${key}T12:00:00Z`));
  if (view === 'day') return full(days[0], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  if (view === 'month') return full(days[0], { month: 'long', year: 'numeric' });
  const first = new Date(`${days[0]}T12:00:00Z`); const last = new Date(`${days[days.length - 1]}T12:00:00Z`);
  if (first.getUTCMonth() === last.getUTCMonth()) return `${first.getUTCDate()}–${last.getUTCDate()} ${full(days[0], { month: 'long', year: 'numeric' })}`;
  return `${full(days[0], { day: 'numeric', month: 'long' })} – ${full(days.at(-1)!, { day: 'numeric', month: 'long', year: 'numeric' })}`;
}

export function nowPosition(now: Date, day: string, timeZone: string, hours: { start: number; end: number }): number | null {
  if (dateKey(now, timeZone) !== day) return null;
  const minute = localMinutes(now, timeZone);
  if (minute < hours.start || minute > hours.end) return null;
  return ((minute - hours.start) / (hours.end - hours.start)) * 100;
}

export function plannerDayUrl(currentSearch: string, day: string): string {
  const params = new URLSearchParams(currentSearch);
  params.set('date', day); params.set('view', 'day');
  return `/planning?${params.toString()}`;
}

// Convert a civil boundary in the display zone to an instant. The iteration
// resolves the zone offset without changing the UTC instants of events.
export function localBoundary(key: string, minute: number, timeZone: string): Date {
  const cacheKey = `${timeZone}|${key}|${minute}`;
  const cached = boundaryCache.get(cacheKey);
  if (cached) return cached;
  const [year, month, day] = key.split('-').map(Number);
  const expected = Date.UTC(year, month - 1, day, Math.floor(minute / 60), minute % 60);
  let candidate = expected;
  for (let index = 0; index < 5; index++) {
    const p = parts(new Date(candidate), timeZone);
    const actual = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    const delta = expected - actual;
    if (!delta) break;
    candidate += delta;
  }
  const result = new Date(candidate);
  if (boundaryCache.size > 512) boundaryCache.clear();
  boundaryCache.set(cacheKey, result);
  return result;
}

export function requestWindow(days: string[], timeZone: string) {
  return { start: localBoundary(days[0], 0, timeZone).toISOString(),
    end: localBoundary(addDays(days[days.length - 1], 1), 0, timeZone).toISOString() };
}

export function formatClock(instant: string | Date, timeZone: string): string {
  return new Intl.DateTimeFormat('fr-CA', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .format(new Date(instant));
}

export function formatDay(key: string): string {
  return new Intl.DateTimeFormat('fr-CA', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' })
    .format(new Date(`${key}T12:00:00Z`));
}

export function visibleHours(days: string[], timeZone: string,
  intervals: Array<{ startUtc: string; endUtc: string }>): { start: number; end: number } {
  let first = 7 * 60;
  let last = 19 * 60;
  const selected = new Set(days);
  for (const interval of intervals) {
    const start = new Date(interval.startUtc);
    const end = new Date(interval.endUtc);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) continue;
    // Include segments crossing midnight as well as events starting in the view.
    for (const day of days) {
      const from = localBoundary(day, 0, timeZone).getTime();
      const to = localBoundary(addDays(day, 1), 0, timeZone).getTime();
      if (start.getTime() >= to || end.getTime() <= from || !selected.has(day)) continue;
      const startMinute = start.getTime() <= from ? 0 : localMinutes(start, timeZone);
      const endMinute = end.getTime() >= to ? 24 * 60 : localMinutes(end, timeZone);
      first = Math.min(first, startMinute);
      last = Math.max(last, endMinute);
    }
  }
  return { start: Math.max(0, Math.floor(first / 60) * 60),
    end: Math.min(24 * 60, Math.ceil(last / 60) * 60) };
}

export function segmentForDay(interval: { startUtc: string; endUtc: string }, day: string,
  timeZone: string, hours: { start: number; end: number }) {
  const start = new Date(interval.startUtc).getTime();
  const end = new Date(interval.endUtc).getTime();
  const dayStart = localBoundary(day, 0, timeZone).getTime();
  const dayEnd = localBoundary(addDays(day, 1), 0, timeZone).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || start >= dayEnd || end <= dayStart) return null;
  const from = start <= dayStart ? 0 : localMinutes(new Date(start), timeZone);
  const to = end >= dayEnd ? 1440 : localMinutes(new Date(end), timeZone);
  const left = Math.max(hours.start, from);
  const right = Math.min(hours.end, to);
  if (right <= left) return null;
  return { left: ((left - hours.start) / (hours.end - hours.start)) * 100,
    width: ((right - left) / (hours.end - hours.start)) * 100 };
}
