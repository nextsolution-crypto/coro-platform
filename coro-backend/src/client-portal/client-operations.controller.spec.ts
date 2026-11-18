import { GUARDS_METADATA } from '@nestjs/common/constants';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ClientJwtGuard } from './client-jwt.guard';
import { ClientFeatureEntitlementService } from '../capability-entitlements/client-feature-entitlement.service';
import {
  ClientIncidentReportsController,
  ClientOperationalCapabilitiesController,
  ClientOperationalDirectivesController,
  ClientOperationalLogController,
  ClientOperationalShiftsController,
} from './client-operations.controller';

describe('Client operational controllers', () => {
  const controllers = [
    ClientOperationalCapabilitiesController,
    ClientIncidentReportsController,
    ClientOperationalLogController,
    ClientOperationalShiftsController,
    ClientOperationalDirectivesController,
  ];

  it('exposes only a non-disclosing capability decision to the portal', async () => {
    const evaluate = jest.fn().mockResolvedValue({
      feature: 'INCIDENT_REPORTS',
      technicallyAvailable: true,
      entitled: false,
      individuallyAuthorized: true,
      buildingAssigned: true,
      available: false,
      reason: 'NOT_ENTITLED',
    });
    const controller = new ClientOperationalCapabilitiesController({
      evaluate,
    } as never);
    const authority = {
      actorId: 'client-user-a',
      organizationId: '00000000-0000-4000-8000-000000000001',
    } as never;
    const response = await controller.list(
      '00000000-0000-4000-8000-000000000001',
      { buildingId: '00000000-0000-4000-8000-000000000002' },
      { coroAuthority: authority },
    );
    expect(response.capabilities).toContainEqual({
      feature: 'INCIDENT_REPORTS',
      available: false,
      reason: 'NOT_AVAILABLE',
    });
    expect(JSON.stringify(response)).not.toContain('NOT_ENTITLED');
  });

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

  it('assigns a typed CLIENT_USER reviewer without falling back to an internal User', async () => {
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
    const workflow = {
      assignClientReviewer: jest.fn().mockResolvedValue({ id: 'report-a' }),
    };
    const controller = new ClientIncidentReportsController(
      {} as never,
      workflow as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const dto = {
      reviewerClientUserId: '00000000-0000-4000-8000-000000000004',
      expectedLockVersion: 1,
      idempotencyKey: '00000000-0000-4000-8000-000000000005',
    };
    await controller.reviewer(
      authority.organizationId,
      '00000000-0000-4000-8000-000000000003',
      dto,
      { coroAuthority: authority },
    );
    expect(workflow.assignClientReviewer).toHaveBeenCalledWith(
      authority.organizationId,
      '00000000-0000-4000-8000-000000000003',
      dto,
      authority,
    );
  });
});

describe('Client operational capabilities HTTP routing', () => {
  let app: INestApplication;
  const evaluate = jest.fn().mockResolvedValue({
    feature: 'INCIDENT_REPORTS',
    available: true,
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ClientOperationalCapabilitiesController],
      providers: [
        {
          provide: ClientFeatureEntitlementService,
          useValue: { evaluate },
        },
      ],
    })
      .overrideGuard(ClientJwtGuard)
      .useValue({
        canActivate: (context: any) => {
          context.switchToHttp().getRequest().coroAuthority = {
            actorId: 'client-user-a',
            organizationId: '00000000-0000-4000-8000-000000000001',
          };
          return true;
        },
      })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => app.close());

  it('accepts the canonical non-UUID building identifier used by CORO Demo', async () => {
    await request(app.getHttpServer())
      .get(
        '/client-portal/organizations/00000000-0000-4000-8000-000000000001/operational-capabilities?buildingId=demo-premont-industrial-001',
      )
      .expect(200);
    expect(evaluate).toHaveBeenCalledWith(
      expect.objectContaining({ buildingId: 'demo-premont-industrial-001' }),
    );
  });

  it('rejects a missing building identifier before entitlement evaluation', async () => {
    evaluate.mockClear();
    await request(app.getHttpServer())
      .get(
        '/client-portal/organizations/00000000-0000-4000-8000-000000000001/operational-capabilities',
      )
      .expect(400);
    expect(evaluate).not.toHaveBeenCalled();
  });
});
