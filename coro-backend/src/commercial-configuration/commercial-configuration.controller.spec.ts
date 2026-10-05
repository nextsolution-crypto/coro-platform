import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { UserRole } from '@prisma/client';
import { PLATFORM_ROLES_KEY } from '../auth/platform-roles.decorator';
import { CommercialConfigurationController } from './commercial-configuration.controller';
import {
  COMMERCIAL_CONFIGURATION_DEFINITIONS,
  definitionFingerprint,
} from './commercial-configuration.registry';

describe('CommercialConfiguration contracts', () => {
  it('is versioned and entirely SUPER_ADMIN protected', () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, CommercialConfigurationController),
    ).toBe('admin/v1/commercial/configurations');
    expect(
      Reflect.getMetadata(
        PLATFORM_ROLES_KEY,
        CommercialConfigurationController,
      ),
    ).toEqual([UserRole.SUPER_ADMIN]);
    expect(
      Reflect.getMetadata(GUARDS_METADATA, CommercialConfigurationController),
    ).toHaveLength(2);
  });
  it('locks one immutable Professional definition', () => {
    expect(COMMERCIAL_CONFIGURATION_DEFINITIONS).toHaveLength(1);
    const d = COMMERCIAL_CONFIGURATION_DEFINITIONS[0];
    expect(`${d.code}/${d.version}`).toBe('professional-direct/v1');
    expect(d.components).toHaveLength(5);
    expect(d.components[0]).toMatchObject({
      pricingModel: 'CAPACITY_BAND',
      billingPeriod: 'YEAR',
      metric: 'SITE',
    });
    expect('tiers' in d.components[0] && d.components[0].tiers).toHaveLength(
      10,
    );
    expect(definitionFingerprint(d)).toMatch(/^[a-f0-9]{64}$/);
  });
});
