import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ClientJwtGuard } from './client-jwt.guard';
import {
  ClientIncidentReportsController,
  ClientOperationalDirectivesController,
  ClientOperationalLogController,
  ClientOperationalShiftsController,
} from './client-operations.controller';

describe('Client operational controllers', () => {
  const controllers = [
    ClientIncidentReportsController,
    ClientOperationalLogController,
    ClientOperationalShiftsController,
    ClientOperationalDirectivesController,
  ];

  it.each(controllers)(
    '%p is protected exclusively by ClientJwtGuard',
    (controller) => {
      const metadata: unknown = Reflect.getMetadata(
        GUARDS_METADATA,
        controller,
      );
      const guards = Array.isArray(metadata)
        ? (metadata as Array<{ name?: string }>)
        : [];
      expect(guards).toContain(ClientJwtGuard);
      expect(
        guards.map((guard: { name?: string }) => guard.name),
      ).not.toContain('AuthGuard');
    },
  );

  it('forwards the canonical ClientUser authority instead of browser actor data', async () => {
    const authority = Object.freeze({
      actorType: 'CLIENT_USER' as const,
      actorId: 'client-user-a',
      clientId: 'client-a',
      organizationId: '00000000-0000-4000-8000-000000000001',
      role: 'CLIENT_MANAGER' as const,
      sessionVersion: 2,
      permissions: [],
      buildingIds: [],
    });
    const reports = { list: jest.fn().mockResolvedValue([]) };
    const controller = new ClientIncidentReportsController(
      reports as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const query = {
      buildingId: '00000000-0000-4000-8000-000000000002',
      limit: 10,
    } as never;
    await controller.list(authority.organizationId, query, {
      coroAuthority: authority,
    });
    expect(reports.list).toHaveBeenCalledWith(
      authority.organizationId,
      query,
      authority,
    );
  });
});
