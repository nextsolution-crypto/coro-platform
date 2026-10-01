import 'reflect-metadata';
import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import request from 'supertest';
import { PLATFORM_ROLES_KEY } from '../auth/platform-roles.decorator';
import { PlatformRolesGuard } from '../auth/platform-roles.guard';
import { CommercialSimulatorController } from './commercial-simulator.controller';
import { CommercialSimulatorService } from './commercial-simulator.service';

class HeaderAuthenticationGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: { id: string; role: UserRole };
    }>();
    const role = req.headers['x-test-role'];
    if (!role) throw new UnauthorizedException();
    req.user = { id: 'test-user', role: role as UserRole };
    return true;
  }
}

describe('CommercialSimulatorController security contract', () => {
  it('is versioned and explicitly SUPER_ADMIN only', () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, CommercialSimulatorController),
    ).toBe('admin/v1/commercial/simulator');
    expect(
      Reflect.getMetadata(PLATFORM_ROLES_KEY, CommercialSimulatorController),
    ).toEqual(['SUPER_ADMIN']);
  });

  describe('effective HTTP RBAC', () => {
    let app: INestApplication;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        controllers: [CommercialSimulatorController],
        providers: [
          Reflector,
          PlatformRolesGuard,
          {
            provide: CommercialSimulatorService,
            useValue: {
              configuratorBootstrap: jest.fn(() => ({ families: [] })),
            },
          },
        ],
      })
        .overrideGuard(AuthGuard('jwt'))
        .useClass(HeaderAuthenticationGuard)
        .compile();
      app = module.createNestApplication();
      await app.init();
    });

    afterAll(async () => app.close());

    it.each([
      [undefined, 401],
      ['OPERATOR', 403],
      ['ADMIN', 403],
      ['SUPER_ADMIN', 200],
    ])(
      'protects Configurator bootstrap for role %s',
      async (role, expected) => {
        const server = app.getHttpServer() as Parameters<typeof request>[0];
        const call = request(server).get(
          '/admin/v1/commercial/simulator/configurator/bootstrap',
        );
        if (role) call.set('x-test-role', role);
        await call.expect(expected);
      },
    );
  });
});
