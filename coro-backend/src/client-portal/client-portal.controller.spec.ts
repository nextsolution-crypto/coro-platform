import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

jest.mock('../export/export.service', () => ({
  ExportService: class ExportService {},
}));

import { ClientPortalController } from './client-portal.controller';
import { ClientPortalService } from './client-portal.service';
import { ClientJwtGuard } from './client-jwt.guard';
import { IncidentService } from '../occupancy/incident.service';
import { OccupancyEmployeesService } from '../occupancy/occupancy-employees.service';
import { OccupancyService } from '../occupancy/occupancy.service';
import { CorrectiveActionsService } from '../occupancy/corrective-actions.service';

describe('ClientPortalController routing', () => {
  let app: INestApplication;

  const actor = {
    sub: 'client-user-1',
    clientId: 'client-1',
    organizationId: 'organization-1',
    role: 'CLIENT_MANAGER',
    buildingIds: ['building-1'],
  };
  const clientPortalService = {
    getPopulationLegacyActiveAlerts: jest.fn(),
    getPopulationAlert: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ClientPortalController],
      providers: [
        { provide: ClientPortalService, useValue: clientPortalService },
        { provide: IncidentService, useValue: {} },
        { provide: OccupancyEmployeesService, useValue: {} },
        { provide: OccupancyService, useValue: {} },
        { provide: CorrectiveActionsService, useValue: {} },
      ],
    })
      .overrideGuard(ClientJwtGuard)
      .useValue({
        canActivate: (context: any) => {
          context.switchToHttp().getRequest().clientUser = actor;
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('route legacy-active vers la primitive statique', async () => {
    clientPortalService.getPopulationLegacyActiveAlerts.mockResolvedValue([
      { id: 'legacy-1', status: 'ACTIVE' },
    ]);

    await request(app.getHttpServer())
      .get(
        '/client-portal/buildings/building-1/population/alerts/legacy-active',
      )
      .expect(200)
      .expect([{ id: 'legacy-1', status: 'ACTIVE' }]);

    expect(
      clientPortalService.getPopulationLegacyActiveAlerts,
    ).toHaveBeenCalledWith('building-1', actor);
    expect(clientPortalService.getPopulationAlert).not.toHaveBeenCalled();
  });

  it('conserve le routage dynamique pour un UUID d’alerte', async () => {
    const alertId = '3c56aa37-ea7d-4c88-bf5a-3c3c16d92ed4';
    clientPortalService.getPopulationAlert.mockResolvedValue({ id: alertId });

    await request(app.getHttpServer())
      .get(`/client-portal/buildings/building-1/population/alerts/${alertId}`)
      .expect(200)
      .expect({ id: alertId });

    expect(clientPortalService.getPopulationAlert).toHaveBeenCalledWith(
      'building-1',
      alertId,
      actor,
    );
    expect(
      clientPortalService.getPopulationLegacyActiveAlerts,
    ).not.toHaveBeenCalled();
  });
});
