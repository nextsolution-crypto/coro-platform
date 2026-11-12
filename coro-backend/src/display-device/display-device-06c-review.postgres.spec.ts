import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

const enabled = process.env.RUN_POSTGRES_TESTS === 'true';
const describePostgres = enabled ? describe : describe.skip;

describePostgres('DISPLAY-06C review database scope constraints', () => {
  const prisma = new PrismaService();

  beforeAll(async () => prisma.$connect());
  afterAll(async () => prisma.$disconnect());

  async function scope(label: string) {
    const suffix = randomUUID();
    const organization = await prisma.organization.create({
      data: { name: `${label}-${suffix}` },
    });
    const client = await prisma.client.create({
      data: { name: `${label}-client`, organizationId: organization.id },
    });
    const building = await prisma.building.create({
      data: {
        name: `${label}-building`,
        address: '1 Review',
        city: 'Montréal',
        province: 'QC',
        organizationId: organization.id,
        clientId: client.id,
      },
    });
    const floor = await prisma.buildingFloor.create({
      data: {
        organizationId: organization.id,
        buildingId: building.id,
        code: `R-${suffix.slice(0, 6)}`,
        name: 'Review floor',
      },
    });
    const location = await prisma.displayLocation.create({
      data: {
        organizationId: organization.id,
        buildingId: building.id,
        floorId: floor.id,
        code: `L-${suffix.slice(0, 6)}`,
        label: 'Review location',
      },
    });
    return { organization, building, location };
  }

  it('rejects cross-tenant locations and nonce organization substitution at the database boundary', async () => {
    const a = await scope('review-a');
    const b = await scope('review-b');

    await expect(
      prisma.displayDevice.create({
        data: {
          id: randomUUID(),
          organizationId: a.organization.id,
          buildingId: a.building.id,
          locationId: b.location.id,
          profile: 'WIDESCREEN_16X9',
          publicKey: 'review-public-key',
          keyId: `review-key-${randomUUID()}`,
        },
      }),
    ).rejects.toThrow();

    const device = await prisma.displayDevice.create({
      data: {
        id: randomUUID(),
        organizationId: a.organization.id,
        buildingId: a.building.id,
        locationId: a.location.id,
        profile: 'WIDESCREEN_16X9',
        publicKey: 'review-public-key',
        keyId: `review-key-${randomUUID()}`,
      },
    });
    await expect(
      prisma.displayDeviceNonce.create({
        data: {
          id: randomUUID(),
          deviceId: device.id,
          organizationId: b.organization.id,
          nonceHash: randomUUID().replaceAll('-', '').padEnd(64, '0'),
          operation: 'review',
          httpMethod: 'POST',
          requestPath: '/device-gateway/manifest',
          bodySha256: 'a'.repeat(64),
          expiresAt: new Date(Date.now() + 60_000),
        },
      }),
    ).rejects.toThrow();
  });
});
