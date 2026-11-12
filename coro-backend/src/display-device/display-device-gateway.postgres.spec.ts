import { DisplayPermission, UserRole } from '@prisma/client';
import {
  generateKeyPairSync,
  randomBytes,
  randomUUID,
  sign,
} from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { deviceEnrollmentStatement, digestSecret } from './device-security';
import { DeviceGatewayService } from './device-gateway.service';

const enabled = process.env.RUN_POSTGRES_TESTS === 'true';
const describePostgres = enabled ? describe : describe.skip;

describePostgres(
  'DISPLAY-06C transactional device authority PostgreSQL',
  () => {
    const prisma = new PrismaService();
    beforeAll(async () => prisma.$connect());
    afterAll(async () => prisma.$disconnect());

    it('consumes enrollment once, preserves scope and enforces append-only events', async () => {
      const suffix = randomUUID();
      const org = await prisma.organization.create({
        data: { name: `Display 06C ${suffix}` },
      });
      const client = await prisma.client.create({
        data: { name: 'Client QA', organizationId: org.id },
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
      const floor = await prisma.buildingFloor.create({
        data: {
          organizationId: org.id,
          buildingId: building.id,
          code: 'RDC',
          name: 'Rez-de-chaussée',
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
          email: `display-06c-${suffix}@example.invalid`,
          password: 'unused',
          firstName: 'Display',
          lastName: 'QA',
          role: UserRole.OPERATOR,
          organizationId: org.id,
          displayPermissions: [DisplayPermission.DISPLAY_READ],
          displayBuildingIds: [building.id],
        },
      });
      const pair = generateKeyPairSync('ed25519');
      const publicKeyPem = pair.publicKey
        .export({ type: 'spki', format: 'pem' })
        .toString();
      const device = await prisma.displayDevice.create({
        data: {
          id: randomUUID(),
          organizationId: org.id,
          buildingId: building.id,
          locationId: location.id,
          profile: 'DISPLAY_16_9',
          status: 'PENDING_ENROLLMENT',
          publicKey: publicKeyPem,
          keyId: 'device-key-1',
        },
      });
      const token = randomBytes(32).toString('base64url');
      const invitation = await prisma.displayDeviceEnrollmentInvitation.create({
        data: {
          id: randomBytes(16).toString('hex'),
          deviceId: device.id,
          organizationId: org.id,
          buildingId: building.id,
          locationId: location.id,
          tokenHash: digestSecret(token),
          expectedKeyId: 'device-key-1',
          expectedPublicKey: publicKeyPem,
          expiresAt: new Date(Date.now() + 60_000),
          createdByUserId: actor.id,
        },
      });
      const proof = {
        invitationId: invitation.id,
        token,
        deviceId: device.id,
        keyId: 'device-key-1',
        publicKeyPem,
        signature: sign(
          null,
          deviceEnrollmentStatement({
            invitationId: invitation.id,
            deviceId: device.id,
            keyId: 'device-key-1',
          }),
          pair.privateKey,
        ).toString('base64'),
        softwareVersion: '0.6.0-test',
        requestId: `enroll-${suffix}`,
      };
      const gateway = new DeviceGatewayService(
        prisma,
        { downloadPrivate: jest.fn() } as any,
        { keyId: 'synthetic', sign: async () => 'synthetic' },
      );
      const results = await Promise.allSettled([
        gateway.enroll(proof),
        gateway.enroll({ ...proof, requestId: `enroll-second-${suffix}` }),
      ]);
      expect(
        results.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(1);
      expect(
        results.filter((result) => result.status === 'rejected'),
      ).toHaveLength(1);
      expect(
        (
          await prisma.displayDevice.findUniqueOrThrow({
            where: { id: device.id },
          })
        ).status,
      ).toBe('ACTIVE');
      expect(
        await prisma.displayDeviceEvent.count({
          where: { deviceId: device.id, eventType: 'ENROLLED' },
        }),
      ).toBe(1);
      const event = await prisma.displayDeviceEvent.findFirstOrThrow({
        where: { deviceId: device.id },
      });
      await expect(
        prisma.displayDeviceEvent.delete({ where: { id: event.id } }),
      ).rejects.toThrow('append-only');
    });
  },
);
