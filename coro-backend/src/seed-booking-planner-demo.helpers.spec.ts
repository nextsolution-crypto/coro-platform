import { assertLocalBookingDemoDatabase, bookingDemoWeek, demoId } from './seed-booking-planner-demo.helpers';

describe('Booking Planner demo seed guards and stable keys', () => {
  it('accepts only the dedicated local PostgreSQL database', () => {
    for (const host of ['localhost', '127.0.0.1', '[::1]']) {
      expect(() => assertLocalBookingDemoDatabase(`postgresql://user:fake@${host}:5432/coro_booking_dev?schema=public`)).not.toThrow();
    }
    for (const value of [undefined, 'postgresql://user:fake@localhost:5432/coro_db',
      'postgresql://user:fake@db.example.invalid:5432/coro_booking_dev',
      'mysql://user:fake@localhost/coro_booking_dev']) {
      expect(() => assertLocalBookingDemoDatabase(value)).toThrow();
    }
  });

  it('computes the current Montréal work week, including a Sunday and year boundary', () => {
    expect(bookingDemoWeek(new Date('2026-09-22T15:00:00Z'))).toMatchObject({
      monday: '2026-09-21', friday: '2026-09-25', nextMonday: '2026-09-28',
    });
    expect(bookingDemoWeek(new Date('2027-01-03T17:00:00Z'))).toMatchObject({
      monday: '2026-12-28', friday: '2027-01-01',
    });
  });

  it('uses deterministic, reserved IDs for idempotent upserts', () => {
    expect(demoId('booking-mathieu')).toBe(demoId('booking-mathieu'));
    expect(demoId('booking-mathieu')).not.toBe(demoId('booking-marco'));
    expect(demoId('booking-mathieu')).toMatch(/^booking-demo-/);
    expect(() => demoId('../other-data')).toThrow();
  });
});
