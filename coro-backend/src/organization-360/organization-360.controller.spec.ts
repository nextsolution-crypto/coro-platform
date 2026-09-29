import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { UserRole } from '@prisma/client';
import { PLATFORM_ROLES_KEY } from '../auth/platform-roles.decorator';
import { Organization360Controller } from './organization-360.controller';

describe('Organization360Controller contract', () => {
  it('est versionné, read-only et explicitement SUPER_ADMIN', () => {
    expect(Reflect.getMetadata(PATH_METADATA, Organization360Controller)).toBe(
      'admin/v1/organizations/:organizationId',
    );
    expect(
      Reflect.getMetadata(PLATFORM_ROLES_KEY, Organization360Controller),
    ).toEqual([UserRole.SUPER_ADMIN]);
    expect(
      Reflect.getMetadata(GUARDS_METADATA, Organization360Controller),
    ).toHaveLength(2);

    const methods = Object.getOwnPropertyNames(
      Organization360Controller.prototype,
    ).filter((name) => name !== 'constructor');
    expect(methods).toEqual([
      'overview',
      'users',
      'clients',
      'sites',
      'capabilities',
      'commercial',
      'usage',
      'security',
      'auditEvents',
    ]);
    for (const method of methods) {
      const handler = Object.getOwnPropertyDescriptor(
        Organization360Controller.prototype,
        method,
      )?.value as object;
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(0);
    }
  });
});
