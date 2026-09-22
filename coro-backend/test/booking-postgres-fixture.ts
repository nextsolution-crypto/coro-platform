import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

// Every suite owns distinct rows. No seed, global delete, or shared fixture IDs.
export async function createBookingFixture(prisma: PrismaClient, secondOrganization = false) {
  const suffix = randomUUID();
  const org = await prisma.organization.create({ data: { id: randomUUID(), name: `Booking gate ${suffix}` } });
  const otherOrg = secondOrganization
    ? await prisma.organization.create({ data: { id: randomUUID(), name: `Other Booking gate ${suffix}` } }) : null;
  const createUser = (organizationId: string, role: 'ADMIN' | 'OPERATOR' = 'OPERATOR') =>
    prisma.user.create({ data: { id: randomUUID(), organizationId,
      email: `${randomUUID()}@booking-gate.invalid`, password: 'test-only', firstName: 'Gate', lastName: 'User',
      role, timeZone: 'America/Toronto', timeZoneVerified: true } });
  const admin = await createUser(org.id, 'ADMIN');
  const owner = await createUser(org.id);
  const colleague = await createUser(org.id);
  const target = await createUser(org.id);
  const outsider = otherOrg ? await createUser(otherOrg.id) : null;
  const client = await prisma.client.create({ data: { id: randomUUID(), organizationId: org.id,
    name: `Client ${suffix}`, regulatoryRequirements: [] } });
  const building = await prisma.building.create({ data: { id: randomUUID(), organizationId: org.id,
    clientId: client.id, name: `Building ${suffix}`, address: '1 Test Street', city: 'Toronto', province: 'ON',
    timeZone: 'America/Toronto', timeZoneVerified: true } });
  const project = await prisma.project.create({ data: { id: randomUUID(), organizationId: org.id,
    clientId: client.id, buildingId: building.id, userId: owner.id,
    name: `Project ${suffix}`, documentType: 'PMU', year: 2026 } });
  const clientUser = await prisma.clientUser.create({ data: { id: randomUUID(), organizationId: org.id,
    clientId: client.id, email: `${randomUUID()}@booking-gate.invalid`, password: 'test-only',
    firstName: 'Client', lastName: 'Gate', buildingIds: [building.id] } });
  const createBooking = (input: { activityId?: string | null; status?: string; assignedUserId?: string;
    requestedDate?: Date; duration?: number } = {}) => prisma.booking.create({ data: {
    id: randomUUID(), organizationId: org.id, projectId: project.id, clientUserId: clientUser.id,
    assignedUserId: input.assignedUserId ?? owner.id, activityId: input.activityId ?? null,
    activityType: 'visite', status: input.status ?? 'CONFIRMEE',
    requestedDate: input.requestedDate ?? new Date('2026-10-07T14:00:00.000Z'), duration: input.duration ?? 60,
  } });
  return { org, otherOrg, admin, owner, colleague, target, outsider, client, building, project,
    clientUser, createBooking };
}
