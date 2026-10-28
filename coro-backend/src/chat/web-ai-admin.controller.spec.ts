import { GUARDS_METADATA } from '@nestjs/common/constants';
import { PATH_METADATA } from '@nestjs/common/constants';
import { PLATFORM_ROLES_KEY } from '../auth/platform-roles.decorator';
import { WebAIAdminController } from './web-ai-admin.controller';

describe('WebAIAdminController security contract', () => {
  it('is mounted under the existing admin authority and requires SUPER_ADMIN', () => {
    expect(Reflect.getMetadata(PATH_METADATA, WebAIAdminController)).toBe('admin/v1/web-ai');
    expect(Reflect.getMetadata(PLATFORM_ROLES_KEY, WebAIAdminController)).toEqual(['SUPER_ADMIN']);
    expect(Reflect.getMetadata(GUARDS_METADATA, WebAIAdminController)).toHaveLength(2);
  });
});
