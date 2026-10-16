import { applyDecorators, SetMetadata } from '@nestjs/common';
import { PlatformPermission } from '@prisma/client';

export const PLATFORM_PERMISSION_KEY = 'platformPermission';
export const PLATFORM_TARGET_ORGANIZATION_PARAM_KEY =
  'platformTargetOrganizationParam';
export const PLATFORM_TARGET_RESOURCE_KEY = 'platformTargetResource';

export type PlatformTargetResource = {
  kind:
    | 'WORKSPACE'
    | 'SCENARIO'
    | 'PROPOSAL'
    | 'PROPOSAL_REVISION'
    | 'CONTRACT'
    | 'CONTRACT_REVISION'
    | 'COMPOSITION_SNAPSHOT'
    | 'ENTITLEMENT';
  param: string;
};

export const RequirePlatformPermission = (
  permission: PlatformPermission,
  targetOrganizationParam?: string,
  targetResource?: PlatformTargetResource,
) => {
  const decorators = [SetMetadata(PLATFORM_PERMISSION_KEY, permission)];
  if (targetOrganizationParam) {
    decorators.push(
      SetMetadata(
        PLATFORM_TARGET_ORGANIZATION_PARAM_KEY,
        targetOrganizationParam,
      ),
    );
  }
  if (targetResource) {
    decorators.push(SetMetadata(PLATFORM_TARGET_RESOURCE_KEY, targetResource));
  }
  return applyDecorators(...decorators);
};
