import { PATH_METADATA } from '@nestjs/common/constants';
import { UserRole } from '@prisma/client';
import { PLATFORM_ROLES_KEY } from '../auth/platform-roles.decorator';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

const handler = (prototype: object, method: string): object =>
  Object.getOwnPropertyDescriptor(prototype, method)?.value as object;

describe('OrganizationsController route contract', () => {
  const service = {
    getMapOverview: jest.fn(),
    findOne: jest.fn(),
    findAllProjectsGlobal: jest.fn(),
    getHealthScores: jest.fn(),
  };
  const controller = new OrganizationsController(
    service as unknown as OrganizationsService,
  );

  it.each([
    ['getMapOverview', 'map/overview'],
    ['getMyOrganization', 'me/info'],
    ['getAllProjectsGlobal', 'admin/all-projects'],
    ['getHealthScores', 'admin/health-scores'],
    ['findOne', ':id'],
  ])('conserve la route statique %s -> %s', (method, path) => {
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        handler(OrganizationsController.prototype, method),
      ),
    ).toBe(path);
  });

  it('déclare la route paramétrée après les routes statiques', () => {
    const methods = Object.getOwnPropertyNames(
      OrganizationsController.prototype,
    );
    expect(methods.indexOf('findOne')).toBeGreaterThan(
      methods.indexOf('getMapOverview'),
    );
    expect(methods.indexOf('findOne')).toBeGreaterThan(
      methods.indexOf('getMyOrganization'),
    );
    expect(methods.indexOf('findOne')).toBeGreaterThan(
      methods.indexOf('getAllProjectsGlobal'),
    );
    expect(methods.indexOf('findOne')).toBeGreaterThan(
      methods.indexOf('getHealthScores'),
    );
  });

  it.each([
    'getMapOverview',
    'getAllProjectsGlobal',
    'getHealthScores',
    'findOne',
  ])('marque %s comme SUPER_ADMIN', (method) => {
    expect(
      Reflect.getMetadata(
        PLATFORM_ROLES_KEY,
        handler(OrganizationsController.prototype, method),
      ),
    ).toEqual([UserRole.SUPER_ADMIN]);
  });

  it('laisse organizations/me/info dans le scope tenant ordinaire', () => {
    expect(
      Reflect.getMetadata(
        PLATFORM_ROLES_KEY,
        handler(OrganizationsController.prototype, 'getMyOrganization'),
      ),
    ).toBeUndefined();
    void controller.getMyOrganization({ user: { organizationId: 'org-1' } });
    expect(service.findOne).toHaveBeenCalledWith('org-1');
  });
});
