import 'reflect-metadata';
import { PATH_METADATA } from '@nestjs/common/constants';
import { PLATFORM_ROLES_KEY } from '../auth/platform-roles.decorator';
import { CommercialSimulatorController } from './commercial-simulator.controller';

describe('CommercialSimulatorController security contract', () => {
  it('is versioned and explicitly SUPER_ADMIN only', () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, CommercialSimulatorController),
    ).toBe('admin/v1/commercial/simulator');
    expect(
      Reflect.getMetadata(PLATFORM_ROLES_KEY, CommercialSimulatorController),
    ).toEqual(['SUPER_ADMIN']);
  });
});
