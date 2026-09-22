import { BookingAssignmentStatus, PrismaClient } from '@prisma/client';
import { createBookingFixture } from './booking-postgres-fixture';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres('BookingAssignment partial indexes on PostgreSQL', () => {
  const prisma = databaseUrl ? new PrismaClient({ datasources: { db: { url: databaseUrl } } }) : new PrismaClient();
  let fixture: Awaited<ReturnType<typeof createBookingFixture>>;

  beforeAll(async () => {
    await prisma.$connect();
    fixture = await createBookingFixture(prisma);
  });
  afterAll(async () => prisma.$disconnect());

  it('allows one active LEAD and rejects a second active LEAD, including ACCEPTED', async () => {
    const booking = await fixture.createBooking();
    const first = await prisma.bookingAssignment.create({ data: {
      bookingId: booking.id, userId: fixture.owner.id, role: 'LEAD', status: 'PENDING',
    } });
    expect(first.status).toBe('PENDING');
    await expect(prisma.bookingAssignment.create({ data: {
      bookingId: booking.id, userId: fixture.colleague.id, role: 'LEAD', status: 'ACCEPTED',
    } })).rejects.toMatchObject({ code: 'P2002' });
    expect(await prisma.bookingAssignment.count({ where: { bookingId: booking.id, role: 'LEAD',
      status: { in: ['PENDING', 'ACCEPTED'] } } })).toBe(1);
  });

  it('permits replacement after the old LEAD becomes terminal', async () => {
    const booking = await fixture.createBooking();
    const old = await prisma.bookingAssignment.create({ data: {
      bookingId: booking.id, userId: fixture.owner.id, role: 'LEAD', status: 'ACCEPTED',
    } });
    await prisma.bookingAssignment.update({ where: { id: old.id }, data: { status: 'REPLACED', endedAt: new Date() } });
    const replacement = await prisma.bookingAssignment.create({ data: {
      bookingId: booking.id, userId: fixture.colleague.id, role: 'LEAD', status: 'PENDING',
    } });
    expect(replacement.status).toBe('PENDING');
    expect(await prisma.bookingAssignment.count({ where: { bookingId: booking.id, role: 'LEAD',
      status: { in: ['PENDING', 'ACCEPTED'] } } })).toBe(1);
    expect(await prisma.bookingAssignment.findUniqueOrThrow({ where: { id: old.id } })).toMatchObject({ status: 'REPLACED' });
  });

  it('rejects an active duplicate person/role and permits multiple terminal history rows', async () => {
    const booking = await fixture.createBooking();
    const data = { bookingId: booking.id, userId: fixture.target.id, role: 'SUPPORT' as const };
    const active = await prisma.bookingAssignment.create({ data: { ...data, status: 'PENDING' } });
    await expect(prisma.bookingAssignment.create({ data: { ...data, status: 'ACCEPTED' } }))
      .rejects.toMatchObject({ code: 'P2002' });
    await prisma.bookingAssignment.update({ where: { id: active.id }, data: { status: 'DECLINED', endedAt: new Date() } });
    for (const status of ['REPLACED', 'REMOVED', 'DECLINED'] as BookingAssignmentStatus[]) {
      await prisma.bookingAssignment.create({ data: { ...data, status, endedAt: new Date() } });
    }
    const next = await prisma.bookingAssignment.create({ data: { ...data, status: 'ACCEPTED' } });
    expect(next.status).toBe('ACCEPTED');
    expect(await prisma.bookingAssignment.count({ where: { ...data,
      status: { in: ['DECLINED', 'REPLACED', 'REMOVED'] } } })).toBe(4);
  });
});
