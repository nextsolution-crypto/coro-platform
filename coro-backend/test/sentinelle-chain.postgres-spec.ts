import { randomUUID, randomBytes } from 'crypto';
import { PrismaService } from '../src/prisma/prisma.service';
import { OccupancyEmployeesService } from '../src/occupancy/occupancy-employees.service';
import { PresenceFlowService } from '../src/occupancy/presence-flow.service';
import { OccupancyService } from '../src/occupancy/occupancy.service';
import { IncidentNotificationDispatcherService } from '../src/occupancy/incident-notification-dispatcher.service';
import { IncidentService } from '../src/occupancy/incident.service';
import { RemindersService } from '../src/reminders/reminders.service';
import { reconcileSentinelleProviderEvent } from '../src/population/sentinelle-provider-reconciliation';

const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;
suite('Sentinelle employee to closed exercise on PostgreSQL', () => {
  const prisma = new PrismaService(
    url ? { datasources: { db: { url } } } : undefined,
  );
  const policy = {
    evaluate: jest.fn(async () => ({ disposition: 'SIMULATED' })),
  };
  const employees = new OccupancyEmployeesService(prisma, policy as any);
  const presence = new PresenceFlowService(prisma);
  const occupancy = new OccupancyService(prisma);
  const dispatcher = new IncidentNotificationDispatcherService(
    prisma,
    {} as any,
  );
  const incident = new IncidentService(prisma, dispatcher, policy as any);
  const oldProviderMode = process.env.INCIDENT_NOTIFICATION_PROVIDER_MODE;
  const oldKey = process.env.INCIDENT_OUTBOX_KEY_BASE64;
  const realFetch = global.fetch;
  let organizationId: string;
  let buildingId: string;
  beforeAll(async () => {
    // All communications in this fixture are simulated. Any network call fails.
    global.fetch = jest.fn(async () => {
      throw new Error('NETWORK_FORBIDDEN_IN_SENTINELLE_QA');
    }) as any;
    process.env.INCIDENT_NOTIFICATION_PROVIDER_MODE = 'FAKE';
    process.env.INCIDENT_OUTBOX_KEY_BASE64 = randomBytes(32).toString('base64');
    await prisma.$connect();
    const org = await prisma.organization.create({
      data: { name: `FICTIF Sentinelle chain ${randomUUID()}` },
    });
    organizationId = org.id;
    const client = await prisma.client.create({
      data: { name: 'FICTIF QA', organizationId, regulatoryRequirements: [] },
    });
    const building = await prisma.building.create({
      data: {
        name: 'FICTIF Usine Sentinelle QA',
        address: '1 rue Fictive',
        city: 'Montréal',
        province: 'QC',
        organizationId,
        clientId: client.id,
      },
    });
    buildingId = building.id;
  });
  afterAll(async () => {
    global.fetch = realFetch;
    if (oldProviderMode === undefined)
      delete process.env.INCIDENT_NOTIFICATION_PROVIDER_MODE;
    else process.env.INCIDENT_NOTIFICATION_PROVIDER_MODE = oldProviderMode;
    if (oldKey === undefined) delete process.env.INCIDENT_OUTBOX_KEY_BASE64;
    else process.env.INCIDENT_OUTBOX_KEY_BASE64 = oldKey;
    await prisma.$disconnect();
  });
  async function punch(token: string, pin: string) {
    const qr = await presence.issueChallenge(token);
    await presence.start(qr.sessionId, qr.challenge);
    const identified = await presence.identify(qr.sessionId, pin);
    const result = await presence.confirm(
      qr.sessionId,
      identified.action,
      randomUUID().replaceAll('-', ''),
      false,
    );
    return { qr, result };
  }
  it('preserves overnight presence through exercise, accounting and closure, then records exit', async () => {
    const employee = await employees.createEmployee(
      {
        buildingId,
        firstName: 'Camille',
        lastName: 'FICTIF',
        email: 'qa@example.invalid',
        isEmergencyMember: true,
        emergencyRole: 'COORDINATOR',
      },
      organizationId,
    );
    expect(employee.pinEmailStatus).toBe('SIMULATED');
    const display = await presence.createDisplay(
      buildingId,
      organizationId,
      'Entrée QA',
    );
    const arrival = await punch(display.publicToken, employee.pin!);
    expect(arrival.result.action).toBe('CHECK_IN');
    const overnight = new Date();
    overnight.setDate(overnight.getDate() - 1);
    overnight.setHours(18, 0, 0, 0);
    await prisma.occupancyRecord.update({
      where: { id: arrival.result.occupancyRecordId! },
      data: { checkedInAt: overnight },
    });
    const current = await occupancy.getCurrentOccupants(
      buildingId,
      organizationId,
    );
    expect(current.total).toBe(1);
    const kiosk = await occupancy.getOrCreateKioskToken(
      buildingId,
      organizationId,
    );
    for (const type of ['VISITEUR', 'CONTRACTEUR']) {
      await occupancy.checkIn({
        buildingId,
        kioskToken: kiosk.token,
        type,
        firstName: type,
        lastName: 'FICTIF',
      });
    }
    // Normal exercise creation and durable outbox; provider mode is strictly FAKE.
    const created = await incident.triggerIncident(
      {
        buildingId,
        type: 'FIRE_ALARM',
        isExercise: true,
        triggeredBy: 'FICTIF QA',
      },
      organizationId,
      undefined,
    );
    expect(created.incident.occupantsSnapshot).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ employeeId: employee.id }),
      ]),
    );
    expect(created.incident.teamSnapshot).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: employee.id })]),
    );
    const queued = await prisma.incidentNotificationDelivery.findMany({
      where: { incidentEventId: created.incident.id },
    });
    expect(queued.length).toBeGreaterThan(0);
    for (const row of queued) {
      await dispatcher.dispatchOne(row.id);
      const accepted =
        await prisma.incidentNotificationDelivery.findUniqueOrThrow({
          where: { id: row.id },
        });
      expect(accepted.status).toBe('SENT');
      await reconcileSentinelleProviderEvent(
        prisma,
        accepted.channel as 'EMAIL' | 'SMS',
        {
          providerMessageId: accepted.providerMessageId!,
          eventType: 'DELIVERED',
          providerOccurredAt: new Date(),
        },
      );
      expect(
        (
          await prisma.incidentNotificationDelivery.findUniqueOrThrow({
            where: { id: row.id },
          })
        ).status,
      ).toBe('DELIVERED');
    }
    const evacuation = await occupancy.triggerEvacuation(
      { buildingId, triggeredBy: 'FICTIF QA' },
      organizationId,
    );
    expect(evacuation.totalPresent).toBe(3);
    await expect(
      occupancy.triggerEvacuation({ buildingId }, organizationId),
    ).rejects.toThrow('déjà active');
    await expect(
      occupancy.resolveEvacuation(evacuation.id, randomUUID()),
    ).rejects.toThrow();
    await new RemindersService(prisma, occupancy).closeStaleCheckins();
    expect(
      (
        await prisma.occupancyRecord.findUniqueOrThrow({
          where: { id: arrival.result.occupancyRecordId! },
        })
      ).status,
    ).toBe('IN');
    let active = await occupancy.getActiveEvacuation(
      buildingId,
      organizationId,
    );
    expect(active?.missing).toBe(3);
    for (const checkin of active!.checkins) {
      await occupancy.accountForOccupant(
        {
          evacuationEventId: evacuation.id,
          occupantRecordId: checkin.occupantRecordId,
          checkedBy: 'FICTIF QA',
        },
        organizationId,
      );
    }
    expect(
      (await occupancy.getActiveEvacuation(buildingId, organizationId))
        ?.missing,
    ).toBe(0);
    await occupancy.resolveEvacuation(evacuation.id, organizationId);
    await incident.resolveIncident(
      created.incident.id,
      { closingNotes: 'Exercice fictif terminé sans communication réelle.' },
      organizationId,
    );
    const departure = await punch(display.publicToken, employee.pin!);
    expect(departure.result.action).toBe('CHECK_OUT');
    for (const record of (
      await occupancy.getCurrentOccupants(buildingId, organizationId)
    ).records) {
      await occupancy.checkOut({
        recordId: record.id,
        kioskToken: kiosk.token,
      });
    }
    expect(
      (await occupancy.getCurrentOccupants(buildingId, organizationId)).total,
    ).toBe(0);
    const record = await prisma.occupancyRecord.findUniqueOrThrow({
      where: { id: arrival.result.occupancyRecordId! },
    });
    expect(record.checkoutSource).toBe('MANUAL');
    expect(
      (await occupancy.getEvacuationDetail(evacuation.id, organizationId))
        .totalPresent,
    ).toBe(3);
    expect(global.fetch).not.toHaveBeenCalled();
  });
  it('closes an overnight employee QR visit exactly once under concurrent exits', async () => {
    const employee = await employees.createEmployee(
      { buildingId, firstName: 'Overnight', lastName: 'FICTIF' },
      organizationId,
      false,
    );
    const kiosk = await occupancy.getOrCreateKioskToken(
      buildingId,
      organizationId,
    );
    const arrival = await employees.checkinByQrToken(
      employee.qrToken,
      kiosk.token,
    );
    await prisma.occupancyRecord.update({
      where: { id: arrival.record.id },
      data: { checkedInAt: new Date(Date.now() - 36 * 3600000) },
    });
    await expect(
      employees.checkoutByQrToken(employee.qrToken, 'wrong-kiosk'),
    ).rejects.toThrow('Token borne invalide');
    const exits = await Promise.all([
      employees.checkoutByQrToken(employee.qrToken, kiosk.token),
      employees.checkoutByQrToken(employee.qrToken, kiosk.token),
    ]);
    expect(exits.filter((exit) => !exit.alreadyOut)).toHaveLength(1);
    expect(exits.filter((exit) => exit.alreadyOut)).toHaveLength(1);
    const closed = await prisma.occupancyRecord.findUniqueOrThrow({
      where: { id: arrival.record.id },
    });
    expect(closed.status).toBe('OUT');
    expect(closed.checkoutSource).toBe('MANUAL');
    expect(closed.checkedOutAt).not.toBeNull();
  });
  it('allocates distinct active PINs under concurrent employee creation', async () => {
    const created = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        employees.createEmployee(
          { buildingId, firstName: `QA${i}`, lastName: 'FICTIF' },
          organizationId,
          false,
        ),
      ),
    );
    expect(new Set(created.map((e) => e.pin)).size).toBe(8);
    await expect(
      prisma.buildingEmployee.create({
        data: {
          buildingId,
          organizationId,
          firstName: 'Duplicate',
          lastName: 'FICTIF',
          pin: created[0].pin,
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });
  it('projects matching PIN evidence once and preserves delivery against late rejection', async () => {
    const employee = await employees.createEmployee(
      { buildingId, firstName: 'Delivery', lastName: 'FICTIF' },
      organizationId,
      false,
    );
    const id = `synthetic-${randomUUID()}`;
    await prisma.buildingEmployee.update({
      where: { id: employee.id },
      data: { pinEmailStatus: 'ACCEPTED', pinEmailMessageId: `<${id}>` },
    });
    const event = {
      providerMessageId: id,
      eventType: 'DELIVERED',
      providerOccurredAt: new Date(),
    };
    await reconcileSentinelleProviderEvent(prisma, 'EMAIL', event);
    await reconcileSentinelleProviderEvent(prisma, 'EMAIL', event);
    await reconcileSentinelleProviderEvent(prisma, 'EMAIL', {
      ...event,
      eventType: 'REJECTED',
    });
    expect(
      (
        await prisma.buildingEmployee.findUniqueOrThrow({
          where: { id: employee.id },
        })
      ).pinEmailStatus,
    ).toBe('DELIVERED');
  });
});
