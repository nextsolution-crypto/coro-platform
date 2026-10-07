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
import { CommercialContentController } from './commercial-content.controller';
import { CommercialContentService } from './commercial-content.service';

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

describe('Commercial content HTTP RBAC', () => {
  let app: INestApplication;
  const service = {
    list: jest.fn(() => []),
    createProfessionalDraft: jest.fn(() => ({ id: 'v1' })),
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [CommercialContentController],
      providers: [
        Reflector,
        PlatformRolesGuard,
        { provide: CommercialContentService, useValue: service },
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
  ])('protects reads for %s', async (role, expected) => {
    const call = request(app.getHttpServer() as Server).get(
      '/admin/v1/commercial/content',
    );
    if (role) call.set('x-test-role', role);
    await call.expect(expected);
  });
  it.each([
    [undefined, 401],
    ['OPERATOR', 403],
    ['ADMIN', 403],
    ['SUPER_ADMIN', 201],
  ])('protects mutations for %s', async (role, expected) => {
    const call = request(app.getHttpServer() as Server).post(
      '/admin/v1/commercial/content/professional-draft',
    );
    if (role) call.set('x-test-role', role);
    await call.expect(expected);
  });
});
