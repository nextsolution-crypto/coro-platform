import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { UserRole } from '@prisma/client';
import { PLATFORM_ROLES_KEY } from '../auth/platform-roles.decorator';
import { CommercialCatalogController } from './commercial-catalog.controller';

describe('CommercialCatalogController security contract', () => {
  it('est versionné et intégralement SUPER_ADMIN', () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, CommercialCatalogController),
    ).toBe('admin/v1');
    expect(
      Reflect.getMetadata(PLATFORM_ROLES_KEY, CommercialCatalogController),
    ).toEqual([UserRole.SUPER_ADMIN]);
    expect(
      Reflect.getMetadata(GUARDS_METADATA, CommercialCatalogController),
    ).toHaveLength(2);
  });
});
