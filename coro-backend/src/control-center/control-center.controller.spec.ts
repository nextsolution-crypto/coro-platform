/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { UserRole } from '@prisma/client';
import { PLATFORM_ROLES_KEY } from '../auth/platform-roles.decorator';
import { ControlCenterController } from './control-center.controller';

describe('ControlCenterController contract', () => {
  it('is versioned, GET-only and SUPER_ADMIN-only', () => {
    expect(Reflect.getMetadata(PATH_METADATA, ControlCenterController)).toBe(
      'admin/v1',
    );
    expect(
      Reflect.getMetadata(PLATFORM_ROLES_KEY, ControlCenterController),
    ).toEqual([UserRole.SUPER_ADMIN]);
    expect(
      Reflect.getMetadata(GUARDS_METADATA, ControlCenterController),
    ).toHaveLength(2);
    const methods = Object.getOwnPropertyNames(
      ControlCenterController.prototype,
    ).filter((name) => name !== 'constructor');
    expect(methods).toEqual([
      'overview',
      'organizations',
      'commercial',
      'reconcile',
      'matrix',
      'tree',
    ]);
    methods.forEach((method) =>
      expect(
        Reflect.getMetadata(
          METHOD_METADATA,
          Object.getOwnPropertyDescriptor(
            ControlCenterController.prototype,
            method,
          )?.value,
        ),
      ).toBe(0),
    );
  });
});
