import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import type { Server } from 'node:http';
import request from 'supertest';
import { PlatformRolesGuard } from '../auth/platform-roles.guard';
import { legacyPlatformAuthorityTestProvider } from '../auth/platform-authority.test-provider';
import { QrCodesController } from './qr-codes.controller';
import { QrCodesService } from './qr-codes.service';

class HeaderGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: { userId: string; role: UserRole };
    }>();
    const role = req.headers['x-test-role'];
    if (!role) throw new UnauthorizedException();
    req.user = { userId: 'actor', role: role as UserRole };
    return true;
  }
}

describe('QrCodesController HTTP boundary', () => {
  let app: INestApplication;
  const service = {
    resolve: jest.fn(() => ({
      destinationUrl: 'https://getcoro.io/contact',
      redirectStatus: 307,
      classification: 'TECHNICAL',
      scope: 'GLOBAL',
    })),
    list: jest.fn(() => []),
    create: jest.fn(() => ({ id: 'qr-1' })),
    update: jest.fn(() => ({ id: 'qr-1' })),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [QrCodesController],
      providers: [
        Reflector,
        PlatformRolesGuard,
        legacyPlatformAuthorityTestProvider,
        { provide: QrCodesService, useValue: service },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useClass(HeaderGuard)
      .compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => app.close());

  it('keeps resolution public and exposes no administrative data', async () => {
    const response = await request(app.getHttpServer() as Server)
      .get('/qr/public/contact')
      .expect(200);
    expect(response.body).toEqual({
      destinationUrl: 'https://getcoro.io/contact',
      redirectStatus: 307,
      classification: 'TECHNICAL',
      scope: 'GLOBAL',
    });
    expect(response.body).not.toHaveProperty('changes');
    expect(response.body).not.toHaveProperty('actorUserId');
  });

  it.each([
    [undefined, 401],
    ['OPERATOR', 403],
    ['ADMIN', 403],
    ['SUPER_ADMIN', 200],
  ])('protects the global registry read for %s', async (role, expected) => {
    const call = request(app.getHttpServer() as Server).get('/qr/admin/codes');
    if (role) call.set('x-test-role', role);
    await call.expect(expected);
  });

  it.each([
    [undefined, 401],
    ['OPERATOR', 403],
    ['ADMIN', 403],
    ['SUPER_ADMIN', 201],
  ])('protects creation for %s', async (role, expected) => {
    const call = request(app.getHttpServer() as Server)
      .post('/qr/admin/codes')
      .send({
        slug: 'documentation',
        destinationUrl: 'https://getcoro.io/contact',
        reason: 'Recette RBAC',
      });
    if (role) call.set('x-test-role', role);
    await call.expect(expected);
  });
});
