import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { PLATFORM_ROLES_KEY } from '../auth/platform-roles.decorator';
import { OrganizationContractsController } from './organization-contracts.controller';
import { OrganizationContractChildrenController } from './organization-contract-children.controller';
describe('OrganizationContractsController security contract', () => {
  it('is namespaced and explicitly SUPER_ADMIN only', () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, OrganizationContractsController),
    ).toBe('admin/v1/organizations/:organizationId/contracts');
    expect(
      Reflect.getMetadata(PLATFORM_ROLES_KEY, OrganizationContractsController),
    ).toEqual(['SUPER_ADMIN']);
    expect(
      Reflect.getMetadata(GUARDS_METADATA, OrganizationContractsController),
    ).toHaveLength(2);
  });
  it('exposes no DELETE handler', () => {
    const source = OrganizationContractsController.toString();
    expect(source).not.toContain('@Delete');
  });
  it('protects child and private-document routes with the same platform role', () => {
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        OrganizationContractChildrenController,
      ),
    ).toBe('admin/v1/organizations/:organizationId/contracts');
    expect(
      Reflect.getMetadata(
        PLATFORM_ROLES_KEY,
        OrganizationContractChildrenController,
      ),
    ).toEqual(['SUPER_ADMIN']);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        OrganizationContractChildrenController,
      ),
    ).toHaveLength(2);
  });
});
