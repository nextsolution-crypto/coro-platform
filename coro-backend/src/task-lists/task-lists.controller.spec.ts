import { UserRole } from '@prisma/client';
import { PLATFORM_ROLES_KEY } from '../auth/platform-roles.decorator';
import { TaskListsController } from './task-lists.controller';

const handler = (method: string): object =>
  Object.getOwnPropertyDescriptor(TaskListsController.prototype, method)
    ?.value as object;

describe('TaskListsController authorization contract', () => {
  it.each(['getAllGlobal', 'createGlobal'])(
    'exige SUPER_ADMIN pour %s',
    (method) => {
      expect(Reflect.getMetadata(PLATFORM_ROLES_KEY, handler(method))).toEqual([
        UserRole.SUPER_ADMIN,
      ]);
    },
  );

  it('conserve la liste tenant accessible selon les règles existantes', () => {
    expect(
      Reflect.getMetadata(PLATFORM_ROLES_KEY, handler('getAll')),
    ).toBeUndefined();
  });
});
