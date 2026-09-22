import { UserRole } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { SchedulingService } from '../src/scheduling/scheduling.service';
import { BookingAssignmentsService } from '../src/bookings/booking-assignments.service';
import { createBookingFixture } from './booking-postgres-fixture';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres('Scheduling locks and Booking assignment rollback on PostgreSQL', () => {
  const prisma = databaseUrl ? new PrismaService({ datasources: { db: { url: databaseUrl } } }) : new PrismaService();
  const scheduling = new SchedulingService(prisma);
  const assignments = new BookingAssignmentsService(prisma, scheduling, {} as any);
  let fixture: Awaited<ReturnType<typeof createBookingFixture>>;

  beforeAll(async () => {
    await prisma.$connect();
    fixture = await createBookingFixture(prisma, true);
  });
  afterAll(async () => prisma.$disconnect());

  it('serializes concurrent ACCEPTED responses and rolls back the conflicting response', async () => {
    const first = await fixture.createBooking({ status: 'CONFIRMEE', assignedUserId: fixture.owner.id });
    const second = await fixture.createBooking({ status: 'CONFIRMEE', assignedUserId: fixture.colleague.id });
    await prisma.bookingAssignment.create({ data: { bookingId: first.id, userId: fixture.owner.id,
      role: 'LEAD', status: 'ACCEPTED' } });
    await prisma.bookingAssignment.create({ data: { bookingId: second.id, userId: fixture.colleague.id,
      role: 'LEAD', status: 'ACCEPTED' } });
    const firstPending = await prisma.bookingAssignment.create({ data: {
      bookingId: first.id, userId: fixture.target.id, role: 'SUPPORT', status: 'PENDING',
    } });
    const secondPending = await prisma.bookingAssignment.create({ data: {
      bookingId: second.id, userId: fixture.target.id, role: 'SUPPORT', status: 'PENDING',
    } });
    const actor = { userId: fixture.target.id, organizationId: fixture.org.id, role: UserRole.OPERATOR };
    const outcomes = await Promise.allSettled([
      assignments.respond(first.id, firstPending.id, 'ACCEPTED', undefined, actor),
      assignments.respond(second.id, secondPending.id, 'ACCEPTED', undefined, actor),
    ]);
    expect(outcomes.filter(outcome => outcome.status === 'fulfilled')).toHaveLength(1);
    expect(outcomes.filter(outcome => outcome.status === 'rejected')).toHaveLength(1);
    const persisted = await prisma.bookingAssignment.findMany({ where: { id: { in: [firstPending.id, secondPending.id] } } });
    expect(persisted.filter(item => item.status === 'ACCEPTED')).toHaveLength(1);
    expect(persisted.filter(item => item.status === 'PENDING' && item.respondedAt === null)).toHaveLength(1);
    const bookings = await prisma.booking.findMany({ where: { id: { in: [first.id, second.id] } } });
    expect(bookings.find(item => item.id === first.id)?.assignedUserId).toBe(fixture.owner.id);
    expect(bookings.find(item => item.id === second.id)?.assignedUserId).toBe(fixture.colleague.id);
    expect(await prisma.bookingAssignment.count({ where: { bookingId: first.id, role: 'LEAD', status: 'ACCEPTED' } })).toBe(1);
    expect(await prisma.bookingAssignment.count({ where: { bookingId: second.id, role: 'LEAD', status: 'ACCEPTED' } })).toBe(1);
  });

  it('rejects a foreign-organization User through real Scheduling and assignment services', async () => {
    const booking = await fixture.createBooking();
    const actor = { userId: fixture.admin.id, organizationId: fixture.org.id, role: UserRole.ADMIN };
    await expect(assignments.add(booking.id, fixture.outsider!.id, 'SUPPORT', actor)).rejects.toThrow();
    await expect(prisma.$transaction(tx => scheduling.lockUsers(tx, fixture.org.id, [fixture.outsider!.id]))).rejects.toThrow();
    expect(await prisma.bookingAssignment.count({ where: { bookingId: booking.id, userId: fixture.outsider!.id } })).toBe(0);
  });
});
