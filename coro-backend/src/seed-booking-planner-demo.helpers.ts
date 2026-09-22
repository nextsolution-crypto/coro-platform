import { localDate } from './work-schedules/work-schedule-time';

export const DEMO_PREFIX = 'booking-demo-';
export const DEMO_ORGANIZATION_ID = `${DEMO_PREFIX}organization`;
export const DEMO_TIME_ZONE = 'America/Toronto';

export function demoId(kind: string): string {
  if (!/^[a-z0-9-]+$/.test(kind)) throw new Error('Clé de démo invalide');
  return `${DEMO_PREFIX}${kind}`;
}

export function assertLocalBookingDemoDatabase(databaseUrl: string | undefined): void {
  if (!databaseUrl) throw new Error('DATABASE_URL local requis pour le seed Booking Demo');
  let url: URL;
  try { url = new URL(databaseUrl); }
  catch { throw new Error('DATABASE_URL PostgreSQL invalide'); }
  if (!['postgresql:', 'postgres:'].includes(url.protocol) ||
      !['localhost', '127.0.0.1', '[::1]', '::1'].includes(url.hostname) ||
      decodeURIComponent(url.pathname) !== '/coro_booking_dev') {
    throw new Error('Seed réservé à PostgreSQL local / coro_booking_dev');
  }
}

function addDays(date: string, count: number): string {
  const instant = new Date(`${date}T12:00:00.000Z`);
  instant.setUTCDate(instant.getUTCDate() + count);
  return instant.toISOString().slice(0, 10);
}

export function bookingDemoWeek(now: Date = new Date()) {
  const today = localDate(now, DEMO_TIME_ZONE);
  const weekday = new Date(`${today}T12:00:00.000Z`).getUTCDay();
  const monday = addDays(today, -(weekday === 0 ? 6 : weekday - 1));
  return { monday, tuesday: addDays(monday, 1), wednesday: addDays(monday, 2),
    thursday: addDays(monday, 3), friday: addDays(monday, 4),
    saturday: addDays(monday, 5), nextMonday: addDays(monday, 7) };
}
