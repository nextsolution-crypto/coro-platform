import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ClientJwtGuard } from './client-jwt.guard';
import { ClientFeatureEntitlementService } from '../capability-entitlements/client-feature-entitlement.service';
import { IncidentReportsService } from '../incident-reports/incident-reports.service';
import { IncidentReportWorkflowService } from '../incident-reports/incident-report-workflow.service';
import { IncidentReportAttachmentsService } from '../incident-reports/incident-report-attachments.service';
import { IncidentReportTemplatesService } from '../incident-reports/incident-report-templates.service';
import { IncidentReportExportsService } from '../incident-reports/incident-report-exports.service';
import { IncidentReportHistoricalService } from '../incident-reports/incident-report-historical.service';
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

  it('routes the client assignment contract with the persistent report UUID', async () => {
    const organizationId = '00000000-0000-4000-8000-000000000001';
    const reportId = '00000000-0000-4000-8000-000000000003';
    const authority = Object.freeze({
      actorType: 'CLIENT_USER' as const,
      actorId: '00000000-0000-4000-8000-000000000008',
      clientId: '00000000-0000-4000-8000-000000000009',
      organizationId,
      role: 'CLIENT_MANAGER' as const,
      sessionVersion: 2,
      permissions: [],
      buildingIds: [],
    });
    const assignClientReviewer = jest.fn().mockResolvedValue({ id: reportId });
    const moduleRef = await Test.createTestingModule({
      controllers: [ClientIncidentReportsController],
      providers: [
        { provide: IncidentReportsService, useValue: {} },
        {
          provide: IncidentReportWorkflowService,
          useValue: { assignClientReviewer },
        },
        { provide: IncidentReportAttachmentsService, useValue: {} },
        { provide: IncidentReportTemplatesService, useValue: {} },
        { provide: IncidentReportExportsService, useValue: {} },
        { provide: IncidentReportHistoricalService, useValue: {} },
      ],
    })
      .overrideGuard(ClientJwtGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context
            .switchToHttp()
            .getRequest<{ coroAuthority?: typeof authority }>();
          req.coroAuthority = authority;
          return true;
        },
      })
      .compile();
    const app = moduleRef.createNestApplication();
    await app.init();
    const dto = {
      reviewerClientUserId: '00000000-0000-4000-8000-000000000004',
      expectedLockVersion: 1,
      idempotencyKey: '00000000-0000-4000-8000-000000000005',
    };

    await request(app.getHttpServer())
      .post(
        `/client-portal/organizations/${organizationId}/incident-reports/${reportId}/reviewer`,
      )
      .send(dto)
      .expect(201)
      .expect({ id: reportId });

    expect(assignClientReviewer).toHaveBeenCalledWith(
      organizationId,
      reportId,
      dto,
      authority,
    );
    await app.close();
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
    process.env.INCIDENT_REPORTS_ENABLED = 'true';
    process.env.INCIDENT_REPORT_ATTACHMENTS_ENABLED = 'false';
    process.env.INCIDENT_REPORT_IMPORT_ENABLED = 'false';
    const response = await request(app.getHttpServer())
      .get(
        '/client-portal/organizations/00000000-0000-4000-8000-000000000001/operational-capabilities?buildingId=demo-premont-industrial-001',
      )
      .expect(200);
    const responseBody = JSON.parse(response.text) as unknown as {
      reportFileCapabilities: unknown;
    };
    expect(responseBody.reportFileCapabilities).toEqual({
      attachmentUpload: {
        available: false,
        reason: 'ANTIVIRUS_PROTECTION_UNAVAILABLE',
      },
      historicalImport: { available: false, reason: 'IMPORT_DISABLED' },
      historicalArchive: {
        available: false,
        reason: 'ARCHIVE_ACCESS_DISABLED',
      },
    });
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
