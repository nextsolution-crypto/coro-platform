import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DisplayPermission, Prisma } from '@prisma/client';
import { AdminAuditService } from '../src/admin-audit/admin-audit.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { SpatialAuthorizationService } from '../src/spatial/spatial-authorization.service';
import { SpatialService } from '../src/spatial/spatial.service';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres(
  'DISPLAY-02A spatial foundations on isolated PostgreSQL',
  () => {
    const prisma = databaseUrl
      ? new PrismaService({ datasources: { db: { url: databaseUrl } } })
      : new PrismaService();
    const service = new SpatialService(
      prisma,
      new SpatialAuthorizationService(prisma),
      new AdminAuditService(),
    );

    beforeAll(() => prisma.$connect());
    afterAll(() => prisma.$disconnect());

    it('enforces explicit permissions, canonical hierarchy, tenant isolation and audit', async () => {
      const suffix = Date.now().toString();
      const [orgA, orgB] = await Promise.all([
        prisma.organization.create({ data: { name: `Display A ${suffix}` } }),
        prisma.organization.create({ data: { name: `Display B ${suffix}` } }),
      ]);
      const [clientA, clientB] = await Promise.all([
        prisma.client.create({
          data: {
            name: `Client A ${suffix}`,
            organizationId: orgA.id,
            regulatoryRequirements: [],
          },
        }),
        prisma.client.create({
          data: {
            name: `Client B ${suffix}`,
            organizationId: orgB.id,
            regulatoryRequirements: [],
          },
        }),
      ]);
      const [buildingA, buildingB] = await Promise.all([
        prisma.building.create({
          data: {
            name: 'A',
            address: '1 QA',
            city: 'Montréal',
            province: 'QC',
            organizationId: orgA.id,
            clientId: clientA.id,
          },
        }),
        prisma.building.create({
          data: {
            name: 'B',
            address: '2 QA',
            city: 'Montréal',
            province: 'QC',
            organizationId: orgB.id,
            clientId: clientB.id,
          },
        }),
      ]);
      const user = await prisma.user.create({
        data: {
          email: `display-${suffix}@example.invalid`,
          password: 'synthetic-only',
          firstName: 'Display',
          lastName: 'QA',
          role: 'ADMIN',
          organizationId: orgA.id,
        },
      });
      const actor = {
        userId: user.id,
        organizationId: orgA.id,
        role: user.role,
      };

      expect(user.displayPermissions).toEqual([]);
      await expect(
        service.listFloors(orgA.id, buildingA.id, actor, {}),
      ).rejects.toBeInstanceOf(ForbiddenException);

      await prisma.user.update({
        where: { id: user.id },
        data: { displayPermissions: [DisplayPermission.DISPLAY_READ] },
      });
      await expect(
        service.listFloors(orgA.id, buildingA.id, actor, {}),
      ).resolves.toEqual([]);
      await expect(
        service.createFloor(
          orgA.id,
          buildingA.id,
          { code: 'RDC', name: 'Rez-de-chaussée' },
          actor,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          displayPermissions: [
            DisplayPermission.DISPLAY_READ,
            DisplayPermission.DISPLAY_DEVICE_MANAGE,
          ],
        },
      });
      const floor = await service.createFloor(
        orgA.id,
        buildingA.id,
        { code: 'RDC', name: 'Rez-de-chaussée', levelNumber: 0 },
        actor,
      );
      const zone = await service.createZone(
        orgA.id,
        buildingA.id,
        floor.id,
        {
          code: 'HALL',
          name: 'Hall principal',
          geometry: { type: 'Polygon', coordinates: [] },
        },
        actor,
      );
      const location = await service.createLocation(
        orgA.id,
        buildingA.id,
        {
          floorId: floor.id,
          zoneId: zone.id,
          code: 'ECRAN-01',
          label: 'Hall principal',
          positionX: 0.25,
          positionY: 0.75,
          youAreHereX: 0.25,
          youAreHereY: 0.75,
        },
        actor,
      );
      expect(location.zoneId).toBe(zone.id);

      await expect(
        service.getFloor(orgA.id, buildingB.id, floor.id, actor),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        service.createZone(
          orgA.id,
          buildingA.id,
          floor.id,
          { code: 'HALL', name: 'Doublon' },
          actor,
        ),
      ).rejects.toBeTruthy();

      const auditCount = await prisma.adminAuditEvent.count({
        where: {
          organizationId: orgA.id,
          targetId: { in: [floor.id, zone.id, location.id] },
        },
      });
      expect(auditCount).toBe(3);

      await expect(prisma.$executeRaw`
      INSERT INTO "BuildingZone" ("id", "organizationId", "buildingId", "floorId", "code", "name", "updatedAt")
      VALUES (${`bad-${suffix}`}, ${orgB.id}, ${buildingB.id}, ${floor.id}, 'BAD', 'Invalid cross tenant', NOW())
    `).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    });
  },
);
