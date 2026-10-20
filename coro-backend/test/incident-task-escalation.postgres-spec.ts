import { randomBytes, randomUUID } from 'crypto';
import { PrismaService } from '../src/prisma/prisma.service';
import { IncidentService } from '../src/occupancy/incident.service';
import { IncidentNotificationDispatcherService } from '../src/occupancy/incident-notification-dispatcher.service';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres('P-4.2 task escalation on PostgreSQL 16', () => {
  const prisma = databaseUrl ? new PrismaService({ datasources: { db: { url: databaseUrl } } }) : new PrismaService();
  const provider = { sendEmail: jest.fn(async () => ({ providerMessageId: `fake-${randomUUID()}` })), sendSms: jest.fn(async () => ({ providerMessageId: `fake-${randomUUID()}` })) } as any;
  const dispatcher = new IncidentNotificationDispatcherService(prisma, provider);
  const service = new IncidentService(prisma, dispatcher);
  const ids = { organization: randomUUID(), user: randomUUID(), client: randomUUID(), building: randomUUID(), primary: randomUUID(), alternate1: randomUUID(), alternate2: randomUUID(), incident: randomUUID(), task: randomUUID() };

  beforeAll(async () => {
    process.env.INCIDENT_OUTBOX_KEY_BASE64 = randomBytes(32).toString('base64');
    process.env.INCIDENT_NOTIFICATION_PROVIDER_MODE = 'FAKE';
    await prisma.$connect();
    await prisma.organization.create({ data: { id: ids.organization, name: 'P42 synthetic organization' } });
    await prisma.user.create({ data: { id: ids.user, organizationId: ids.organization, email: `p42-supervisor-${ids.user}@example.invalid`, password: 'synthetic-only', firstName: 'P42', lastName: 'Supervisor', role: 'OPERATOR' } });
    await prisma.client.create({ data: { id: ids.client, organizationId: ids.organization, name: 'P42 synthetic client', regulatoryRequirements: [] } });
    await prisma.building.create({ data: { id: ids.building, organizationId: ids.organization, clientId: ids.client, name: 'P42 synthetic building', address: '42 QA Street', city: 'Toronto', province: 'ON' } });
    for (const [id, firstName, email] of [[ids.primary, 'Primary', `primary-${ids.primary}@example.invalid`], [ids.alternate1, 'AlternateOne', `alternate1-${ids.alternate1}@example.invalid`], [ids.alternate2, 'AlternateTwo', `alternate2-${ids.alternate2}@example.invalid`]]) {
      await prisma.buildingEmployee.create({ data: { id, buildingId: ids.building, organizationId: ids.organization, firstName, lastName: 'P42', email, isActive: true, isEmergencyMember: true } });
    }
    await prisma.incidentEvent.create({ data: { id: ids.incident, buildingId: ids.building, organizationId: ids.organization, type: 'FIRE_ALARM', status: 'ACTIVE', triggeredBy: 'P42 QA', occupantsSnapshot: [], teamSnapshot: [], isActive: true } });
    await prisma.incidentTask.create({ data: { id: ids.task, incidentEventId: ids.incident, employeeId: ids.primary, role: 'EPI', title: 'Critical synthetic task', status: 'PENDING' } });
  });

  afterAll(async () => {
    // The QA database is disposable. IncidentAuditEvent is deliberately
    // append-only, so teardown must not weaken or bypass that invariant.
    await prisma.$disconnect();
  });

  it('persists the policy, wins one concurrent claim, and retains missed evidence through operator escalation', async () => {
    const configured = await service.configureTaskEscalation(ids.task, { severity: 'CRITICAL', alternateEmployeeIds: [ids.alternate1, ids.alternate2], acknowledgmentSubjectType: 'USER', acknowledgmentSubjectId: ids.user, lockVersion: 0, reason: 'P42 governed policy' }, ids.organization, { actorType: 'USER', actorId: ids.user, reason: 'P42 governed policy' });
    expect(configured.ackDeadlineAt!.getTime() - configured.updatedAt.getTime()).toBeLessThanOrEqual(120_000);
    await prisma.incidentTask.update({ where: { id: ids.task }, data: { nextEscalationAt: new Date(Date.now() - 1000) } });
    const concurrent = await Promise.all([service.processTaskEscalation(ids.task), service.processTaskEscalation(ids.task)]);
    expect(concurrent.filter(result => result.claimed)).toHaveLength(1);
    let current = await prisma.incidentTask.findUniqueOrThrow({ where: { id: ids.task } });
    expect(current).toMatchObject({ escalationStatus: 'LEVEL_1', escalationLevel: 1 });
    expect(current.missedAcknowledgmentAt).toBeInstanceOf(Date);
    expect(await prisma.incidentNotificationDelivery.count({ where: { incidentEventId: ids.incident, purpose: 'TASK_ACK_ESCALATION_LEVEL_1' } })).toBe(1);

    await prisma.incidentTask.update({ where: { id: ids.task }, data: { nextEscalationAt: new Date(Date.now() - 1000) } });
    await service.processTaskEscalation(ids.task);
    await prisma.incidentTask.update({ where: { id: ids.task }, data: { nextEscalationAt: new Date(Date.now() - 1000) } });
    await service.processTaskEscalation(ids.task);
    current = await prisma.incidentTask.findUniqueOrThrow({ where: { id: ids.task } });
    expect(current).toMatchObject({ escalationStatus: 'OPERATOR_QUEUE', escalationLevel: 3 });
    expect(current.operatorQueuedAt).toBeInstanceOf(Date);
    expect(current.missedAcknowledgmentAt).toBeInstanceOf(Date);
  });

  it('rolls the state mutation back when append-only audit insertion fails', async () => {
    const before = await prisma.incidentTask.findUniqueOrThrow({ where: { id: ids.task } });
    await prisma.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION p42_reject_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic audit rejection'; END $$`);
    await prisma.$executeRawUnsafe(`CREATE TRIGGER p42_reject_audit_trigger BEFORE INSERT ON "IncidentAuditEvent" FOR EACH ROW EXECUTE FUNCTION p42_reject_audit()`);
    try {
      await expect(service.configureTaskEscalation(ids.task, { severity: 'HIGH', alternateEmployeeIds: [], acknowledgmentSubjectType: 'USER', acknowledgmentSubjectId: ids.user, lockVersion: before.lockVersion, reason: 'Must roll back' }, ids.organization, { actorType: 'USER', actorId: ids.user, reason: 'Must roll back' })).rejects.toThrow('synthetic audit rejection');
      const after = await prisma.incidentTask.findUniqueOrThrow({ where: { id: ids.task } });
      expect(after.lockVersion).toBe(before.lockVersion);
      expect(after.severity).toBe(before.severity);
    } finally {
      await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS p42_reject_audit_trigger ON "IncidentAuditEvent"`);
      await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS p42_reject_audit()`);
    }
  });
});
