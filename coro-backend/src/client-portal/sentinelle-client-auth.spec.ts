import {
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

jest.mock('../export/export.service', () => ({
  ExportService: class ExportService {},
}));

import { ClientJwtGuard } from './client-jwt.guard';
import { ClientPortalController } from './client-portal.controller';
import { ClientPortalService } from './client-portal.service';
import { OccupancyController } from '../occupancy/occupancy.controller';

const actor = {
  sub: 'client-user-1',
  clientId: 'client-1',
  organizationId: 'organization-1',
  role: 'CLIENT_MANAGER',
  buildingIds: ['building-1'],
};

describe('Sentinelle Client Portal authentication boundary', () => {
  it('keeps Client Portal and platform occupancy guards distinct', () => {
    const clientGuards = Reflect.getMetadata('__guards__', ClientPortalController);
    const platformGuards = Reflect.getMetadata(
      '__guards__',
      OccupancyController.prototype.getKioskToken,
    );
    expect(clientGuards).toContain(ClientJwtGuard);
    expect(platformGuards).toBeDefined();
    expect(platformGuards).not.toContain(ClientJwtGuard);
  });

  it('accepts a current ClientUser session and rejects missing, platform, stale, and inactive sessions', async () => {
    const verify = jest.fn();
    const prisma = { clientUser: { findFirst: jest.fn() } };
    const guard = new ClientJwtGuard({ verify } as any, prisma as any);
    const request: any = { headers: {} };
    const context: any = {
      switchToHttp: () => ({ getRequest: () => request }),
    };

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    request.headers.authorization = 'Bearer token';
    verify.mockReturnValue({
      type: 'PLATFORM',
      sub: 'platform-user-1',
      organizationId: actor.organizationId,
      authVersion: 1,
    });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    verify.mockReturnValue({ ...actor, sessionVersion: 3, type: 'CLIENT' });
    prisma.clientUser.findFirst.mockResolvedValue({ sessionVersion: 4 });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    prisma.clientUser.findFirst.mockResolvedValue(null);
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    prisma.clientUser.findFirst.mockResolvedValue({ sessionVersion: 3 });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.clientUser).toMatchObject({
      type: 'CLIENT',
      sub: actor.sub,
      organizationId: actor.organizationId,
      sessionVersion: 3,
    });
  });

  it('enforces organization, client ownership, and scoped-manager building access', async () => {
    const prisma = { building: { findFirst: jest.fn() } };
    const service = Object.create(ClientPortalService.prototype) as ClientPortalService;
    (service as any).prisma = prisma;

    prisma.building.findFirst.mockResolvedValue(null);
    await expect(
      service.assertBuildingAccess('building-other-org', actor),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.building.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'building-other-org',
          organizationId: actor.organizationId,
        },
      }),
    );

    prisma.building.findFirst.mockResolvedValue({
      id: 'building-2',
      clientId: actor.clientId,
    });
    await expect(
      service.assertBuildingAccess('building-2', actor),
    ).rejects.toBeInstanceOf(ForbiddenException);

    prisma.building.findFirst.mockResolvedValue({
      id: 'building-1',
      clientId: 'client-other',
    });
    await expect(
      service.assertBuildingAccess('building-1', {
        ...actor,
        buildingIds: [],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    prisma.building.findFirst.mockResolvedValue({
      id: 'building-1',
      clientId: actor.clientId,
    });
    await expect(
      service.assertBuildingAccess('building-1', actor),
    ).resolves.toEqual({ id: 'building-1', clientId: actor.clientId });
  });

  it('resolves incident and task scope through their owning building', async () => {
    const prisma = {
      incidentEvent: {
        findFirst: jest.fn().mockResolvedValue({ buildingId: 'building-1' }),
      },
      incidentTask: {
        findFirst: jest.fn().mockResolvedValue({
          incidentEvent: { buildingId: 'building-1' },
        }),
      },
    };
    const service = Object.create(ClientPortalService.prototype) as ClientPortalService;
    (service as any).prisma = prisma;
    service.assertBuildingAccess = jest.fn().mockResolvedValue({
      id: 'building-1',
      clientId: actor.clientId,
    });

    await service.assertIncidentAccess('incident-1', actor);
    expect(prisma.incidentEvent.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'incident-1',
        organizationId: actor.organizationId,
      },
      select: { buildingId: true },
    });
    expect(service.assertBuildingAccess).toHaveBeenCalledWith(
      'building-1',
      actor,
    );

    await service.assertIncidentTaskAccess('task-1', actor);
    expect(prisma.incidentTask.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'task-1',
        incidentEvent: { organizationId: actor.organizationId },
      },
      select: { incidentEvent: { select: { buildingId: true } } },
    });
    expect(service.assertBuildingAccess).toHaveBeenLastCalledWith(
      'building-1',
      actor,
    );
  });

  it('authorizes the building before delegating kiosk-token and ignores browser-supplied building identity', async () => {
    const clientPortalService = {
      assertBuildingAccess: jest.fn().mockResolvedValue({ id: 'building-1' }),
    };
    const occupancyService = {
      getOrCreateKioskToken: jest.fn().mockResolvedValue({ token: 'opaque' }),
      triggerEvacuation: jest.fn().mockResolvedValue({ id: 'evacuation-1' }),
    };
    const controller = new ClientPortalController(
      clientPortalService as any,
      {} as any,
      {} as any,
      occupancyService as any,
      {} as any,
      {} as any,
    );
    const request = { clientUser: actor };

    await expect(
      controller.getSentinelleKioskToken('building-1', request),
    ).resolves.toEqual({ token: 'opaque' });
    expect(clientPortalService.assertBuildingAccess).toHaveBeenCalledWith(
      'building-1',
      actor,
    );
    expect(occupancyService.getOrCreateKioskToken).toHaveBeenCalledWith(
      'building-1',
      actor.organizationId,
    );

    await controller.triggerSentinelleEvacuation(
      'building-1',
      { buildingId: 'attacker-building', triggeredBy: 'Client User' } as any,
      request,
    );
    expect(occupancyService.triggerEvacuation).toHaveBeenCalledWith(
      { buildingId: 'building-1', triggeredBy: 'Client User' },
      actor.organizationId,
    );
  });

  it('does not call the occupancy service after an authorization failure', async () => {
    const clientPortalService = {
      assertBuildingAccess: jest
        .fn()
        .mockRejectedValue(new ForbiddenException()),
    };
    const occupancyService = { getOrCreateKioskToken: jest.fn() };
    const controller = new ClientPortalController(
      clientPortalService as any,
      {} as any,
      {} as any,
      occupancyService as any,
      {} as any,
      {} as any,
    );

    await expect(
      controller.getSentinelleKioskToken('building-2', {
        clientUser: actor,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(occupancyService.getOrCreateKioskToken).not.toHaveBeenCalled();
  });
});
