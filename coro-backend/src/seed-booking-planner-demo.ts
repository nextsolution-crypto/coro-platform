import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from './prisma/prisma.service';
import { SchedulingService } from './scheduling/scheduling.service';
import { WorkSchedulesService } from './work-schedules/work-schedules.service';
import { PlanningService } from './planning/planning.service';
import { CapacityService } from './mandate/capacity.service';
import { buildingLocalToUtc } from './bookings/booking-time';
import { localMidnight } from './work-schedules/work-schedule-time';
import { assertLocalBookingDemoDatabase, bookingDemoWeek, DEMO_ORGANIZATION_ID,
  DEMO_TIME_ZONE, demoId } from './seed-booking-planner-demo.helpers';

const ADMIN_EMAIL = 'admin@getcoro.io';
const DEMO_PASSWORD = 'BookingDemo2026!';
const names = ['Mathieu', 'Marco', 'Solange', 'Amel', 'Juan'] as const;
type AdvisorName = typeof names[number];

const userId = (name: AdvisorName) => demoId(`user-${name.toLowerCase()}`);
const adminId = demoId('admin');
const activityId = (key: string) => demoId(`activity-${key}`);
const bookingId = (key: string) => demoId(`booking-${key}`);
const assignmentId = (key: string) => demoId(`assignment-${key}`);
const at = (date: string, time: string) => buildingLocalToUtc(`${date}T${time}`, DEMO_TIME_ZONE);

type DemoBooking = { key: string; label: string; date: string; time: string; duration: number;
  status: string; lead: AdvisorName; leadStatus: 'PENDING' | 'ACCEPTED';
  support?: AdvisorName; requestedDate?: Date };

async function ensureBase(prisma: PrismaService, hash: string) {
  const organizationId = DEMO_ORGANIZATION_ID;
  const clientId = demoId('client');
  const buildingId = demoId('building');
  const projectId = demoId('project');
  const clientUserId = demoId('client-user');
  await prisma.$transaction(async tx => {
    await tx.organization.upsert({ where: { id: organizationId },
      create: { id: organizationId, name: 'CORO Booking Demo', isActive: true },
      update: { name: 'CORO Booking Demo', isActive: true } });
    await tx.user.upsert({ where: { id: adminId }, create: {
      id: adminId, organizationId, email: ADMIN_EMAIL, password: hash,
      firstName: 'Admin', lastName: 'Booking Demo', role: 'ADMIN', isActive: true,
      timeZone: DEMO_TIME_ZONE, timeZoneVerified: true,
    }, update: { email: ADMIN_EMAIL, password: hash, firstName: 'Admin', lastName: 'Booking Demo',
      role: 'ADMIN', isActive: true, timeZone: DEMO_TIME_ZONE, timeZoneVerified: true } });
    for (const name of names) {
      const data = { email: `booking-demo-${name.toLowerCase()}@example.invalid`, password: hash,
        firstName: name, lastName: 'Demo', role: 'OPERATOR' as const, isActive: true,
        timeZone: DEMO_TIME_ZONE, timeZoneVerified: true, horaireBase: 40 };
      await tx.user.upsert({ where: { id: userId(name) }, create: {
        id: userId(name), organizationId, ...data }, update: data });
    }
    await tx.client.upsert({ where: { id: clientId }, create: { id: clientId, organizationId,
      name: 'Client CORO Booking Demo', regulatoryRequirements: [] },
      update: { name: 'Client CORO Booking Demo' } });
    await tx.building.upsert({ where: { id: buildingId }, create: {
      id: buildingId, organizationId, clientId, name: 'Bâtiment Montréal Demo',
      address: '100 rue de la Démo', city: 'Montréal', province: 'QC',
      timeZone: DEMO_TIME_ZONE, timeZoneVerified: true,
    }, update: { name: 'Bâtiment Montréal Demo', address: '100 rue de la Démo', city: 'Montréal',
      province: 'QC', timeZone: DEMO_TIME_ZONE, timeZoneVerified: true } });
    await tx.project.upsert({ where: { id: projectId }, create: {
      id: projectId, organizationId, clientId, buildingId, userId: userId('Mathieu'),
      name: 'Projet Team Planner Demo', documentType: 'PMU', year: new Date().getFullYear(), isActive: true,
    }, update: { name: 'Projet Team Planner Demo', isActive: true } });
    await tx.clientUser.upsert({ where: { id: clientUserId }, create: {
      id: clientUserId, organizationId, clientId, buildingIds: [buildingId],
      email: 'booking-demo-client@example.invalid', password: hash,
      firstName: 'Client', lastName: 'Demo', isActive: true,
    }, update: { password: hash, isActive: true, buildingIds: [buildingId] } });
    await tx.projectMandate.upsert({ where: { projectId }, create: {
      id: demoId('mandate'), projectId, organizationId,
      ownerId: userId('Mathieu'), description: 'Mandat de développement Team Planner', heuresBudgetees: 24,
    }, update: { ownerId: userId('Mathieu'), heuresBudgetees: 24 } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 30_000 });
  return { organizationId, clientId, buildingId, projectId, clientUserId };
}

async function ensureSchedules(prisma: PrismaService, scheduling: SchedulingService, weekStart: string) {
  const service = new WorkSchedulesService(prisma, scheduling);
  const intervals = [1, 2, 3, 4, 5].flatMap(dayOfWeek => [
    { dayOfWeek, startTime: 8 * 60, endTime: 12 * 60 },
    { dayOfWeek, startTime: 13 * 60, endTime: 17 * 60 },
  ]);
  for (const name of names.filter(value => value !== 'Juan')) {
    const existing = await prisma.userWorkSchedule.findFirst({ where: {
      organizationId: DEMO_ORGANIZATION_ID, userId: userId(name), effectiveUntil: null,
    } });
    if (!existing) await service.replace(userId(name), { effectiveFrom: weekStart, intervals }, {
      userId: adminId, organizationId: DEMO_ORGANIZATION_ID, role: 'ADMIN',
    });
  }
}

async function ensureScenario(prisma: PrismaService, week: ReturnType<typeof bookingDemoWeek>,
  base: Awaited<ReturnType<typeof ensureBase>>) {
  const bookings: DemoBooking[] = [
    { key: 'mathieu-confirmed', label: 'Visite confirmée Mathieu', date: week.monday, time: '09:00',
      duration: 120, status: 'CONFIRMEE', lead: 'Mathieu', leadStatus: 'ACCEPTED' },
    { key: 'marco-confirmed', label: 'Atelier confirmé Marco', date: week.tuesday, time: '13:00',
      duration: 180, status: 'CONFIRMEE', lead: 'Marco', leadStatus: 'ACCEPTED' },
    { key: 'juan-requested', label: 'Demande client Juan', date: week.wednesday, time: '09:00',
      duration: 180, status: 'DEMANDEE', lead: 'Juan', leadStatus: 'PENDING' },
    { key: 'team-confirmed', label: 'Intervention multi-conseillers', date: week.wednesday, time: '13:00',
      duration: 180, status: 'CONFIRMEE', lead: 'Marco', leadStatus: 'ACCEPTED', support: 'Solange' },
    { key: 'amel-reported', label: 'Visite reportée Amel', date: week.thursday, time: '14:00',
      duration: 120, status: 'REPORTEE', lead: 'Amel', leadStatus: 'ACCEPTED',
      requestedDate: at(week.monday, '14:00') },
  ];
  await prisma.$transaction(async tx => {
    for (const item of bookings) {
      const effective = at(item.date, item.time);
      const activity = { organizationId: base.organizationId, projectId: base.projectId,
        type: 'visite', label: item.label, duration: `${item.duration / 60} h`,
        scheduledDate: effective, assigneeEmail: `booking-demo-${item.lead.toLowerCase()}@example.invalid`,
        status: 'a_faire', sourceMandate: true, clientBookable: true, clientVisible: true };
      await tx.projectActivity.upsert({ where: { id: activityId(item.key) },
        create: { id: activityId(item.key), ...activity }, update: activity });
      const booking = { organizationId: base.organizationId, projectId: base.projectId,
        clientUserId: base.clientUserId, activityId: activityId(item.key),
        assignedUserId: userId(item.lead), activityType: item.label,
        requestedDate: item.requestedDate ?? effective,
        reportedDate: item.status === 'REPORTEE' ? effective : null,
        duration: item.duration, status: item.status };
      await tx.booking.upsert({ where: { id: bookingId(item.key) },
        create: { id: bookingId(item.key), ...booking }, update: booking });
      const lead = { bookingId: bookingId(item.key), userId: userId(item.lead),
        role: 'LEAD' as const, status: item.leadStatus, assignedByUserId: adminId,
        respondedAt: item.leadStatus === 'ACCEPTED' ? new Date() : null };
      await tx.bookingAssignment.upsert({ where: { id: assignmentId(`${item.key}-lead`) },
        create: { id: assignmentId(`${item.key}-lead`), ...lead }, update: lead });
      if (item.support) {
        const support = { bookingId: bookingId(item.key), userId: userId(item.support),
          role: 'SUPPORT' as const, status: 'PENDING' as const, assignedByUserId: adminId,
          respondedAt: null };
        await tx.bookingAssignment.upsert({ where: { id: assignmentId(`${item.key}-support`) },
          create: { id: assignmentId(`${item.key}-support`), ...support }, update: support });
      }
    }
    const absence = { organizationId: base.organizationId, userId: userId('Amel'),
      startAt: at(week.thursday, '14:30'), endAt: at(week.thursday, '15:30'),
      timeZone: DEMO_TIME_ZONE, type: 'PERSONAL' as const,
      privateNote: 'booking-demo-private-note-never-in-planner', createdByUserId: adminId };
    await tx.userUnavailability.upsert({ where: { id: demoId('unavailability-amel') },
      create: { id: demoId('unavailability-amel'), ...absence }, update: absence });
    const unplanned = { organizationId: base.organizationId, projectId: base.projectId,
      type: 'visite', label: 'Activité à planifier', duration: '2 h',
      scheduledDate: null, assigneeEmail: null, status: 'a_faire', sourceMandate: true,
      clientBookable: false, clientVisible: true };
    await tx.projectActivity.upsert({ where: { id: activityId('unplanned') },
      create: { id: activityId('unplanned'), ...unplanned }, update: unplanned });
    const legacy = { organizationId: base.organizationId, projectId: base.projectId,
      type: 'visite', label: 'Activité legacy Amel', duration: '4 h',
      scheduledDate: at(week.friday, '13:00'), assigneeEmail: 'booking-demo-amel@example.invalid',
      status: 'a_faire', sourceMandate: false, clientBookable: false, clientVisible: true };
    await tx.projectActivity.upsert({ where: { id: activityId('legacy-amel') },
      create: { id: activityId('legacy-amel'), ...legacy }, update: legacy });
    for (const [index, name] of names.entries()) {
      const hours = 3 + index * 2;
      const future = { organizationId: base.organizationId, projectId: base.projectId,
        type: 'visite', label: `Charge future ${name}`, duration: `${hours} h`,
        scheduledDate: at(week.nextMonday, '09:00'),
        assigneeEmail: `booking-demo-${name.toLowerCase()}@example.invalid`, status: 'a_faire',
        sourceMandate: false, clientBookable: false, clientVisible: true };
      await tx.projectActivity.upsert({ where: { id: activityId(`future-${name.toLowerCase()}`) },
        create: { id: activityId(`future-${name.toLowerCase()}`), ...future }, update: future });
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 30_000 });
}

export async function seedBookingPlannerDemo(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  assertLocalBookingDemoDatabase(databaseUrl);
  const prisma = new PrismaService({ datasources: { db: { url: databaseUrl! } } });
  try {
    await prisma.$connect();
    const database = await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
    if (database[0]?.name !== 'coro_booking_dev') {
      throw new Error('La base connectée n’est pas coro_booking_dev');
    }
    const week = bookingDemoWeek();
    const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
    const base = await ensureBase(prisma, hash);
    const scheduling = new SchedulingService(prisma);
    await ensureSchedules(prisma, scheduling, week.monday);
    await ensureScenario(prisma, week, base);

    const planning = new PlanningService(prisma, scheduling, new CapacityService(prisma));
    const snapshot = await planning.team({
      start: localMidnight(week.monday, DEMO_TIME_ZONE).toISOString(),
      end: localMidnight(week.saturday, DEMO_TIME_ZONE).toISOString(),
      displayTimeZone: DEMO_TIME_ZONE,
    }, { userId: adminId, organizationId: DEMO_ORGANIZATION_ID, role: 'ADMIN' });
    const summary = snapshot.actionSummary;
    if (!summary.requestedBookings || !summary.bookingsWithoutAcceptedLead ||
        !summary.pendingAssignments || !summary.blockedConflicts ||
        !summary.unknownAvailability || !summary.unplannedActivities) {
      throw new Error('La projection Team Planner ne contient pas tous les cas attendus');
    }
    if (JSON.stringify(snapshot).includes('booking-demo-private-note-never-in-planner')) {
      throw new Error('La projection Team Planner expose une note privée');
    }
    console.log('Seed CORO Booking Demo ready');
    console.log('Organization: CORO Booking Demo');
    console.log(`Admin email: ${ADMIN_EMAIL}`);
    console.log(`Mot de passe démo : ${DEMO_PASSWORD}`);
    console.log(`Planner week: ${week.monday} → ${week.friday} (${DEMO_TIME_ZONE})`);
    console.log(`Conseillers : ${names.join(', ')}`);
    console.log('Scénarios : confirmations, demande, multi-conseillers, report, absence, activité non planifiée, activité legacy.');
    console.log(`Actions : ${JSON.stringify(summary)}`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedBookingPlannerDemo().catch(() => {
    console.error('Seed Booking Demo échoué. Vérifier la base locale, les migrations et la projection.');
    process.exitCode = 1;
  });
}
