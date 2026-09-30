import { PATH_METADATA } from '@nestjs/common/constants';
import { PLATFORM_ROLES_KEY } from '../auth/platform-roles.decorator';
import { MeteringController } from './metering.controller';

describe('MeteringController', () => {
  it('is versioned and explicitly SUPER_ADMIN only', () => {
    expect(Reflect.getMetadata(PATH_METADATA, MeteringController)).toBe(
      'admin/v1',
    );
    expect(Reflect.getMetadata(PLATFORM_ROLES_KEY, MeteringController)).toEqual(
      ['SUPER_ADMIN'],
    );
  });
  it('does not expose update or delete operations', () => {
    expect(Object.getOwnPropertyNames(MeteringController.prototype)).toEqual(
      expect.not.arrayContaining(['update', 'remove', 'delete']),
    );
  });
});
