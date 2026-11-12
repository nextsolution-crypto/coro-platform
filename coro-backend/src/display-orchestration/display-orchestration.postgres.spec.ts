import { Prisma, UserRole } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

const enabled = process.env.RUN_POSTGRES_TESTS === 'true';
const describePostgres = enabled ? describe : describe.skip;

describePostgres('DISPLAY-07 transactional orchestration PostgreSQL', () => {
  const prisma = new PrismaService();
  beforeAll(async () => prisma.$connect());
  afterAll(async () => prisma.$disconnect());

  it('commits event, command, delivery and outbox atomically and enforces tenant scope', async () => {
    const suffix = randomUUID();
    const org = await prisma.organization.create({
      data: { name: `Display 07 ${suffix}` },
    });
    const foreignOrg = await prisma.organization.create({
      data: { name: `Foreign 07 ${suffix}` },
    });
    const client = await prisma.client.create({
      data: { name: 'Client QA', organizationId: org.id },
    });
    const foreignClient = await prisma.client.create({
      data: { name: 'Foreign QA', organizationId: foreignOrg.id },
    });
    const building = await prisma.building.create({
      data: {
        name: 'Tour QA',
        address: '1 QA',
        city: 'Montréal',
        province: 'QC',
        organizationId: org.id,
        clientId: client.id,
      },
    });
    const foreignBuilding = await prisma.building.create({
      data: {
        name: 'Tour étrangère',
        address: '2 QA',
        city: 'Montréal',
        province: 'QC',
        organizationId: foreignOrg.id,
        clientId: foreignClient.id,
      },
    });
    const floor = await prisma.buildingFloor.create({
      data: {
        organizationId: org.id,
        buildingId: building.id,
        code: 'RDC',
        name: 'RDC',
      },
    });
    const location = await prisma.displayLocation.create({
      data: {
        organizationId: org.id,
        buildingId: building.id,
        floorId: floor.id,
        code: 'HALL',
        label: 'Hall',
      },
    });
    const actor = await prisma.user.create({
      data: {
        email: `display07-${suffix}@example.invalid`,
        password: 'unused',
        firstName: 'Display',
        lastName: 'QA',
        role: UserRole.OPERATOR,
        organizationId: org.id,
      },
    });
    const device = await prisma.displayDevice.create({
      data: {
        organizationId: org.id,
        buildingId: building.id,
        locationId: location.id,
        profile: 'DISPLAY_16_9',
        status: 'ACTIVE',
        publicKey: 'synthetic',
        keyId: `key-${suffix}`,
      },
    });
    const eventId = randomUUID();
    const commandId = randomUUID();
    await prisma.$transaction(
      async (tx) => {
        await tx.displayOperationalEvent.create({
          data: {
            id: eventId,
            organizationId: org.id,
            buildingId: building.id,
            eventType: 'EXERCISE',
            severity: 'INFORMATION',
            source: 'SIMULATOR',
            exercise: true,
            payload: { synthetic: true },
            actorUserId: actor.id,
            authorization: { permission: 'DISPLAY_EMERGENCY_ACTIVATE' },
            correlationId: suffix,
            idempotencyKey: `event-${suffix}`,
            occurredAt: new Date(),
          },
        });
        await tx.displayOperationalCommand.create({
          data: {
            id: commandId,
            eventId,
            organizationId: org.id,
            buildingId: building.id,
            type: 'ENTER_EXERCISE',
            priority: 'EMERGENCY_EXERCISE',
            targetScope: { deviceIds: [device.id] },
            authorization: { actorUserId: actor.id },
            source: 'SIMULATOR',
            correlationId: suffix,
            idempotencyKey: `command-${suffix}`,
            policyVersion: 'DISPLAY-07/1',
            sequence: BigInt(1),
            signedPayload: { commandId },
            signingKeyId: 'synthetic',
            signature: 'synthetic',
            status: 'QUEUED',
            authorizedById: actor.id,
            authorizedAt: new Date(),
          },
        });
        await tx.displayCommandDelivery.create({
          data: {
            commandId,
            organizationId: org.id,
            buildingId: building.id,
            deviceId: device.id,
          },
        });
        await tx.displayCommandOutbox.create({
          data: { commandId, organizationId: org.id, buildingId: building.id },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    expect(
      await prisma.displayCommandDelivery.count({ where: { commandId } }),
    ).toBe(1);
    expect(
      await prisma.displayCommandOutbox.count({ where: { commandId } }),
    ).toBe(1);
    await expect(
      prisma.displayOperationalEvent.delete({ where: { id: eventId } }),
    ).rejects.toThrow('append-only');
    await expect(
      prisma.displayCommandDelivery.create({
        data: {
          commandId,
          organizationId: foreignOrg.id,
          buildingId: foreignBuilding.id,
          deviceId: device.id,
        },
      }),
    ).rejects.toThrow(/scope mismatch/i);
    await expect(
      prisma.displayOperationalCommand.create({
        data: {
          eventId,
          organizationId: org.id,
          buildingId: building.id,
          type: 'ENTER_EXERCISE',
          priority: 'EMERGENCY_EXERCISE',
          targetScope: {},
          authorization: {},
          source: 'SIMULATOR',
          correlationId: suffix,
          idempotencyKey: `command-${suffix}`,
          policyVersion: 'DISPLAY-07/1',
          sequence: BigInt(2),
          signedPayload: {},
          signingKeyId: 'synthetic',
          signature: 'synthetic',
          authorizedById: actor.id,
          authorizedAt: new Date(),
        },
      }),
    ).rejects.toThrow();
  });

  it('rolls back the whole orchestration transaction when outbox creation fails', async () => {
    const org = await prisma.organization.findFirstOrThrow({
      where: { name: { startsWith: 'Display 07 ' } },
    });
    const building = await prisma.building.findFirstOrThrow({
      where: { organizationId: org.id },
    });
    const actor = await prisma.user.findFirstOrThrow({
      where: { organizationId: org.id },
    });
    const eventId = randomUUID();
    const commandId = randomUUID();
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.displayOperationalEvent.create({
          data: {
            id: eventId,
            organizationId: org.id,
            buildingId: building.id,
            eventType: 'EXERCISE',
            severity: 'INFORMATION',
            source: 'SIMULATOR',
            exercise: true,
            payload: {},
            actorUserId: actor.id,
            authorization: {},
            correlationId: eventId,
            idempotencyKey: eventId,
            occurredAt: new Date(),
          },
        });
        await tx.displayOperationalCommand.create({
          data: {
            id: commandId,
            eventId,
            organizationId: org.id,
            buildingId: building.id,
            type: 'ENTER_EXERCISE',
            priority: 'EMERGENCY_EXERCISE',
            targetScope: {},
            authorization: {},
            source: 'SIMULATOR',
            correlationId: eventId,
            idempotencyKey: commandId,
            policyVersion: 'DISPLAY-07/1',
            sequence: BigInt(99),
            signedPayload: {},
            signingKeyId: 'synthetic',
            signature: 'synthetic',
            authorizedById: actor.id,
            authorizedAt: new Date(),
          },
        });
        await tx.displayCommandOutbox.create({
          data: { commandId, organizationId: 'foreign', buildingId: 'foreign' },
        });
      }),
    ).rejects.toThrow();
    expect(
      await prisma.displayOperationalEvent.findUnique({
        where: { id: eventId },
      }),
    ).toBeNull();
    expect(
      await prisma.displayOperationalCommand.findUnique({
        where: { id: commandId },
      }),
    ).toBeNull();
  });
});
