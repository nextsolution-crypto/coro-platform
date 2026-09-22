import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { createBookingFixture } from './booking-postgres-fixture';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres('Booking one-open-per-Activity partial index on PostgreSQL', () => {
  const prisma = databaseUrl ? new PrismaClient({ datasources: { db: { url: databaseUrl } } }) : new PrismaClient();
  let fixture: Awaited<ReturnType<typeof createBookingFixture>>;

  beforeAll(async () => { await prisma.$connect(); fixture = await createBookingFixture(prisma); });
  afterAll(async () => prisma.$disconnect());

  it('rejects two open attempts, then allows retry after REFUSEE and ANNULEE', async () => {
    const activity = await prisma.projectActivity.create({ data: { id: randomUUID(),
      organizationId: fixture.org.id, projectId: fixture.project.id,
      type: 'visite', label: 'PostgreSQL gate', duration: '1 h', clientBookable: true } });
    const first = await fixture.createBooking({ activityId: activity.id, status: 'DEMANDEE' });
    await expect(fixture.createBooking({ activityId: activity.id, status: 'CONFIRMEE' }))
      .rejects.toMatchObject({ code: 'P2002' });
    await prisma.booking.update({ where: { id: first.id }, data: { status: 'REFUSEE' } });
    const second = await fixture.createBooking({ activityId: activity.id, status: 'REPORTEE' });
    await prisma.booking.update({ where: { id: second.id }, data: { status: 'ANNULEE' } });
    const third = await fixture.createBooking({ activityId: activity.id, status: 'REASSIGNEE' });
    await prisma.booking.update({ where: { id: third.id }, data: { status: 'COMPLETEE' } });
    const fourth = await fixture.createBooking({ activityId: activity.id, status: 'CONFIRMEE' });
    expect(fourth.status).toBe('CONFIRMEE');
    expect(await prisma.booking.count({ where: { activityId: activity.id,
      status: { in: ['REFUSEE', 'ANNULEE', 'COMPLETEE'] } } })).toBe(3);
    expect(await prisma.booking.count({ where: { activityId: activity.id,
      status: { in: ['DEMANDEE', 'CONFIRMEE', 'REPORTEE', 'REASSIGNEE'] } } })).toBe(1);
  });

  it('allows multiple open legacy Bookings with activityId NULL', async () => {
    const first = await fixture.createBooking({ activityId: null, status: 'DEMANDEE' });
    const second = await fixture.createBooking({ activityId: null, status: 'CONFIRMEE' });
    expect(first.id).not.toBe(second.id);
    expect(await prisma.booking.count({ where: { id: { in: [first.id, second.id] }, activityId: null } })).toBe(2);
  });
});
