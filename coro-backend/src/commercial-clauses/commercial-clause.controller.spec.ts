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
import { CommercialClauseController } from './commercial-clause.controller';
import { CommercialClauseService } from './commercial-clause.service';

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

describe('Commercial clause HTTP RBAC', () => {
  let app: INestApplication;
  const service = {
    list: jest.fn(() => []),
    approvedProjection: jest.fn(() => []),
    createDraftCatalog: jest.fn(() => []),
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [CommercialClauseController],
      providers: [
        Reflector,
        PlatformRolesGuard,
        { provide: CommercialClauseService, useValue: service },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useClass(HeaderGuard)
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
      '/admin/v1/commercial/clauses',
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
      '/admin/v1/commercial/clauses/draft-catalog',
    );
    if (role) call.set('x-test-role', role);
    await call.expect(expected);
  });
});
