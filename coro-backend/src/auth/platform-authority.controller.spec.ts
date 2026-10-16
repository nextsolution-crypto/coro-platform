import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { PlatformAuthorityController } from './platform-authority.controller';
import { PlatformAuthorityService } from './platform-authority.service';

class SyntheticJwtGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    context.switchToHttp().getRequest<{ user?: { userId: string } }>().user = {
      userId: 'synthetic-user',
    };
    return true;
  }
}

describe('PlatformAuthorityController HTTP', () => {
  let app: INestApplication<App>;
  const authority = {
    effectivePermissions: jest.fn(),
    createDraft: jest.fn(),
    activate: jest.fn(),
    listGrants: jest.fn(),
    createGrant: jest.fn(),
    revokeGrant: jest.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [PlatformAuthorityController],
      providers: [{ provide: PlatformAuthorityService, useValue: authority }],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useClass(SyntheticJwtGuard)
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => app.close());
  beforeEach(() => jest.clearAllMocks());

  it('projects effective authority from the authenticated actor', async () => {
    authority.effectivePermissions.mockResolvedValue({
      authorityStatus: 'ACTIVE',
      founder: false,
      grants: [],
    });
    await request(app.getHttpServer())
      .get('/admin/v1/platform-authority/me')
      .expect(200)
      .expect({ authorityStatus: 'ACTIVE', founder: false, grants: [] });
    expect(authority.effectivePermissions).toHaveBeenCalledWith({
      userId: 'synthetic-user',
    });
  });

  it('rejects a malformed grant before service mutation', async () => {
    await request(app.getHttpServer())
      .post('/admin/v1/platform-authority/grants')
      .send({ permission: 'NOT_A_PERMISSION', scope: 'GLOBAL' })
      .expect(400);
    expect(authority.createGrant).not.toHaveBeenCalled();
  });
});
