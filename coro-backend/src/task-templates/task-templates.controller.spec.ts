import { UserRole } from '@prisma/client';
import { PLATFORM_ROLES_KEY } from '../auth/platform-roles.decorator';
import { TaskTemplatesController } from './task-templates.controller';

const handler = (method: string): object =>
  Object.getOwnPropertyDescriptor(TaskTemplatesController.prototype, method)
    ?.value as object;

describe('TaskTemplatesController authorization contract', () => {
  it.each(['getAll', 'create', 'update', 'delete', 'seed'])(
    'exige SUPER_ADMIN pour %s',
    (method) => {
      expect(Reflect.getMetadata(PLATFORM_ROLES_KEY, handler(method))).toEqual([
        UserRole.SUPER_ADMIN,
      ]);
    },
  );

  it.each(['getMyTemplates', 'createForOrg', 'getCombined'])(
    'ne change pas le scope tenant de %s',
    (method) => {
      expect(
        Reflect.getMetadata(PLATFORM_ROLES_KEY, handler(method)),
      ).toBeUndefined();
    },
  );
});
