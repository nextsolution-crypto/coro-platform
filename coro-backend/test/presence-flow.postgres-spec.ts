import { ConflictException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PresenceFlowService } from '../src/occupancy/presence-flow.service';

describe('Sentinelle simultaneous presence (PostgreSQL)', () => {
  const prisma = new PrismaClient();
  const service = new PresenceFlowService(prisma as any);
  let organizationId: string;
  let secondOrganizationId: string;
  let buildingId: string;
  let employeeId: string;
  let secondEmployeeId: string;
  let displayToken: string;
  let secondDisplayToken: string;

  beforeAll(async () => {
    await prisma.$connect();
    const organization = await prisma.organization.create({
      data: { name: 'QA Sentinelle Alpha' },
    });
    const secondOrganization = await prisma.organization.create({
      data: { name: 'QA Sentinelle Beta' },
    });
    organizationId = organization.id;
    secondOrganizationId = secondOrganization.id;
    const client = await prisma.client.create({
      data: {
        name: 'Client QA Alpha',
        organizationId,
        regulatoryRequirements: [],
      },
    });
    const secondClient = await prisma.client.create({
      data: {
        name: 'Client QA Beta',
        organizationId: secondOrganizationId,
        regulatoryRequirements: [],
      },
    });
    const building = await prisma.building.create({
      data: {
        name: 'Édifice Alpha',
        address: '1 rue QA',
        city: 'Québec',
        province: 'QC',
        organizationId,
        clientId: client.id,
      },
    });
    const secondBuilding = await prisma.building.create({
      data: {
        name: 'Édifice Beta',
        address: '2 rue QA',
        city: 'Québec',
        province: 'QC',
        organizationId: secondOrganizationId,
        clientId: secondClient.id,
      },
    });
    buildingId = building.id;
    const employee = await prisma.buildingEmployee.create({
      data: {
        buildingId,
        organizationId,
        firstName: 'Ariane',
        lastName: 'Alpha',
        pin: '1234',
      },
    });
    employeeId = employee.id;
    const secondEmployee = await prisma.buildingEmployee.create({
      data: {
        buildingId,
        organizationId,
        firstName: 'Chloe',
        lastName: 'Alpha',
        pin: '5678',
      },
    });
    secondEmployeeId = secondEmployee.id;
    await prisma.buildingEmployee.create({
      data: {
        buildingId: secondBuilding.id,
        organizationId: secondOrganizationId,
        firstName: 'Benoît',
        lastName: 'Beta',
        pin: '1234',
      },
    });
    const display = await prisma.presenceKioskDisplay.create({
      data: { buildingId, organizationId, label: 'Entrée Est' },
    });
    displayToken = display.publicToken;
    const secondDisplay = await prisma.presenceKioskDisplay.create({
      data: { buildingId, organizationId, label: 'Entrance West' },
    });
    secondDisplayToken = secondDisplay.publicToken;
  });

  afterAll(async () => {
    const organizationIds = [organizationId, secondOrganizationId];
    await prisma.presenceSession.deleteMany({
      where: { organizationId: { in: organizationIds } },
    });
    await prisma.presenceDeviceSession.deleteMany({
      where: { organizationId: { in: organizationIds } },
    });
    await prisma.occupancyRecord.deleteMany({
      where: { organizationId: { in: organizationIds } },
    });
    await prisma.presenceKioskDisplay.deleteMany({
      where: { organizationId: { in: organizationIds } },
    });
    await prisma.buildingEmployee.deleteMany({
      where: { organizationId: { in: organizationIds } },
    });
    await prisma.building.deleteMany({
      where: { organizationId: { in: organizationIds } },
    });
    await prisma.client.deleteMany({
      where: { organizationId: { in: organizationIds } },
    });
    await prisma.organization.deleteMany({
      where: { id: { in: [organizationId, secondOrganizationId] } },
    });
    await prisma.$disconnect();
  });

  async function identifiedSession() {
    const issued = await service.issueChallenge(displayToken);
    await service.start(issued.sessionId, issued.challenge);
    const identity = await service.identify(issued.sessionId, '1234');
    expect(identity.firstName).toBe('Ariane');
    expect(identity.buildingName).toBe('Édifice Alpha');
    return { id: issued.sessionId, action: identity.action };
  }

  it('serializes simultaneous arrivals from two phones without duplicate presence', async () => {
    const [phoneA, phoneB] = await Promise.all([identifiedSession(), identifiedSession()]);
    expect(phoneA.action).toBe('CHECK_IN');
    expect(phoneB.action).toBe('CHECK_IN');

    const [resultA, resultB] = await Promise.all([
      service.confirm(phoneA.id, 'CHECK_IN', `arrival-${phoneA.id}`, false),
      service.confirm(phoneB.id, 'CHECK_IN', `arrival-${phoneB.id}`, false),
    ]);

    expect(resultA.occupancyRecordId).toBe(resultB.occupancyRecordId);
    expect(
      await prisma.occupancyRecord.count({
        where: { employeeId, status: 'IN' },
      }),
    ).toBe(1);
  });

  it('records one departure and fails closed for a concurrent stale confirmation', async () => {
    const [phoneA, phoneB] = await Promise.all([identifiedSession(), identifiedSession()]);
    expect(phoneA.action).toBe('CHECK_OUT');
    expect(phoneB.action).toBe('CHECK_OUT');

    const outcomes = await Promise.allSettled([
      service.confirm(phoneA.id, 'CHECK_OUT', `departure-${phoneA.id}`, false),
      service.confirm(phoneB.id, 'CHECK_OUT', `departure-${phoneB.id}`, false),
    ]);

    expect(outcomes.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = outcomes.find((result) => result.status === 'rejected') as PromiseRejectedResult;
    expect(rejected.reason).toBeInstanceOf(ConflictException);
    expect(
      await prisma.occupancyRecord.count({
        where: { employeeId, status: 'IN' },
      }),
    ).toBe(0);
    expect(
      await prisma.occupancyRecord.count({
        where: { employeeId, status: 'OUT' },
      }),
    ).toBe(1);
  });

  it('keeps a started transaction valid after QR rotation and exposes both building displays', async () => {
    const issued = await service.issueChallenge(displayToken);
    await service.start(issued.sessionId, issued.challenge);
    await prisma.presenceSession.update({
      where: { id: issued.sessionId },
      data: { challengeExpiresAt: new Date(Date.now() - 1_000) },
    });

    const identity = await service.identify(issued.sessionId, '1234');
    expect(identity.firstName).toBe('Ariane');
    expect(identity.action).toBe('CHECK_IN');
    await expect(
      service.confirm(issued.sessionId, 'CHECK_IN', `rotated-${issued.sessionId}`, false),
    ).resolves.toEqual(expect.objectContaining({ action: 'CHECK_IN' }));

    const displays = await service.listDisplays(buildingId, organizationId);
    expect(displays.map((item) => item.publicToken)).toEqual(
      expect.arrayContaining([displayToken, secondDisplayToken]),
    );
    expect(displays).toHaveLength(2);
    expect(displays.map((item) => item.label)).toContain('Entrance West');
  });

  it('recognizes a remembered phone, revokes it, then allows a different user', async () => {
    const first = await identifiedSession();
    expect(first.action).toBe('CHECK_OUT');
    const remembered = await service.confirm(
      first.id,
      'CHECK_OUT',
      `remember-${first.id}`,
      true,
    );
    expect(remembered.deviceToken).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const recognizedChallenge = await service.issueChallenge(displayToken);
    const recognized = await service.start(
      recognizedChallenge.sessionId,
      recognizedChallenge.challenge,
      remembered.deviceToken,
    );
    expect(recognized.recognized).toEqual(
      expect.objectContaining({ firstName: 'Ariane', action: 'CHECK_IN' }),
    );

    await service.forgetDevice(remembered.deviceToken);
    const changedChallenge = await service.issueChallenge(displayToken);
    const changed = await service.start(
      changedChallenge.sessionId,
      changedChallenge.challenge,
      remembered.deviceToken,
    );
    expect(changed.recognized).toBeNull();
    const secondIdentity = await service.identify(changedChallenge.sessionId, '5678');
    expect(secondIdentity.firstName).toBe('Chloe');
    expect(
      await prisma.presenceSession.findUnique({
        where: { id: changedChallenge.sessionId },
        select: { employeeId: true },
      }),
    ).toEqual({ employeeId: secondEmployeeId });

    const secondRemembered = await service.confirm(
      changedChallenge.sessionId,
      'CHECK_IN',
      `change-user-${changedChallenge.sessionId}`,
      true,
    );
    await prisma.presenceDeviceSession.updateMany({
      where: { employeeId: secondEmployeeId, revokedAt: null },
      data: { expiresAt: new Date(Date.now() - 1_000) },
    });
    const expiredChallenge = await service.issueChallenge(secondDisplayToken);
    const expired = await service.start(
      expiredChallenge.sessionId,
      expiredChallenge.challenge,
      secondRemembered.deviceToken,
    );
    expect(expired.recognized).toBeNull();
  });
});
