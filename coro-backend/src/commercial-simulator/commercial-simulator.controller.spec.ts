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
      user?: { userId: string; role: UserRole };
    }>();
    const role = req.headers['x-test-role'];
    if (!role) throw new UnauthorizedException();
    req.user = { userId: 'test-user', role: role as UserRole };
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
    const createGuidedWorkspace = jest.fn(
      (_dto: unknown, actor: { userId: string }) => ({
        id: 'test-workspace',
        actorUserId: actor.userId,
      }),
    );

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
              createGuidedWorkspace,
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

    it.each([
      [undefined, 401],
      ['OPERATOR', 403],
      ['ADMIN', 403],
      ['SUPER_ADMIN', 201],
    ])(
      'protects guided Workspace creation for role %s',
      async (role, expected) => {
        const server = app.getHttpServer() as Parameters<typeof request>[0];
        const call = request(server)
          .post('/admin/v1/commercial/simulator/configurator/workspaces')
          .send({ title: 'Test workspace' });
        if (role) call.set('x-test-role', role);
        await call.expect(expected);
      },
    );

    it('passes the canonical authenticated userId to the audited service actor', async () => {
      createGuidedWorkspace.mockClear();
      const server = app.getHttpServer() as Parameters<typeof request>[0];

      await request(server)
        .post('/admin/v1/commercial/simulator/configurator/workspaces')
        .set('x-test-role', 'SUPER_ADMIN')
        .send({ title: 'Actor contract regression' })
        .expect(201)
        .expect({ id: 'test-workspace', actorUserId: 'test-user' });

      expect(createGuidedWorkspace).toHaveBeenCalledWith(
        { title: 'Actor contract regression' },
        { userId: 'test-user' },
      );
    });
  });
});
