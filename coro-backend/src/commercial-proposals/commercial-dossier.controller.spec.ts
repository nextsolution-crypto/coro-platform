import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import type { Server } from 'node:http';
import request from 'supertest';
import { PLATFORM_ROLES_KEY } from '../auth/platform-roles.decorator';
import { PlatformRolesGuard } from '../auth/platform-roles.guard';
import { CommercialDossierController } from './commercial-dossier.controller';
import { CommercialDossierService } from './commercial-dossier.service';

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

describe('Commercial dossier API security contract', () => {
  let app: INestApplication;
  const service = {
    get: jest.fn(() => ({ observationOnly: true })),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [CommercialDossierController],
      providers: [
        Reflector,
        PlatformRolesGuard,
        { provide: CommercialDossierService, useValue: service },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useClass(HeaderAuthenticationGuard)
      .compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => app.close());

  it('is an explicit SUPER_ADMIN-only platform route', () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, CommercialDossierController),
    ).toBe('admin/v1/commercial/dossiers');
    expect(
      Reflect.getMetadata(PLATFORM_ROLES_KEY, CommercialDossierController),
    ).toEqual(['SUPER_ADMIN']);
    expect(
      Reflect.getMetadata(GUARDS_METADATA, CommercialDossierController),
    ).toHaveLength(2);
  });

  it('exposes only a read operation', () => {
    const names = Object.getOwnPropertyNames(
      CommercialDossierController.prototype,
    );
    expect(names).toEqual(['constructor', 'get']);
  });

  it.each([
    [undefined, 401],
    ['OPERATOR', 403],
    ['ADMIN', 403],
    ['SUPER_ADMIN', 200],
  ])('protects dossier reads for %s', async (role, expected) => {
    const call = request(app.getHttpServer() as Server).get(
      '/admin/v1/commercial/dossiers/PROSPECT/04b11b33-11b4-4b2c-a494-44d4935b6c2c',
    );
    if (role) call.set('x-test-role', role);
    await call.expect(expected);
  });
});
