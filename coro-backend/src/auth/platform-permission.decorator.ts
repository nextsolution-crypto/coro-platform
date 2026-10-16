import { applyDecorators, SetMetadata } from '@nestjs/common';
import { PlatformPermission } from '@prisma/client';

export const PLATFORM_PERMISSION_KEY = 'platformPermission';
export const PLATFORM_TARGET_ORGANIZATION_PARAM_KEY =
  'platformTargetOrganizationParam';

export const RequirePlatformPermission = (
  permission: PlatformPermission,
  targetOrganizationParam?: string,
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
  return applyDecorators(...decorators);
};
