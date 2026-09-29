import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { readFileSync } from 'fs';
import { PLATFORM_ROLES_KEY } from '../auth/platform-roles.decorator';
import {
  CapabilityEntitlementsController,
  ClientEntitlementsController,
  ContractEntitlementProvisioningController,
  SiteEntitlementsController,
} from './capability-entitlements.controller';
describe('Capability entitlement API security', () => {
  it.each([
    [
      CapabilityEntitlementsController,
      'admin/v1/organizations/:organizationId/entitlements',
    ],
    [
      ClientEntitlementsController,
      'admin/v1/organizations/:organizationId/clients/:clientId/entitlements',
    ],
    [
      SiteEntitlementsController,
      'admin/v1/organizations/:organizationId/sites/:buildingId/entitlements',
    ],
    [
      ContractEntitlementProvisioningController,
      'admin/v1/organizations/:organizationId/contracts/:contractId/revisions/:revisionId/provision-entitlements',
    ],
  ])('protects %p as SUPER_ADMIN', (controller, path) => {
    expect(Reflect.getMetadata(PATH_METADATA, controller)).toBe(path);
    expect(Reflect.getMetadata(PLATFORM_ROLES_KEY, controller)).toEqual([
      'SUPER_ADMIN',
    ]);
    expect(Reflect.getMetadata(GUARDS_METADATA, controller)).toHaveLength(2);
  });
  it('exposes no DELETE route', () => {
    expect(
      readFileSync(
        __dirname + '/capability-entitlements.controller.ts',
        'utf8',
      ),
    ).not.toContain('@Delete');
  });
});
