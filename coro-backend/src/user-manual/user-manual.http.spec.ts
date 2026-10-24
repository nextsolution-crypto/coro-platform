import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { JwtStrategy } from '../auth/jwt.strategy';
import { ClientJwtGuard } from '../client-portal/client-jwt.guard';
import { PrismaService } from '../prisma/prisma.service';
import {
  UserManualClientController,
  UserManualInternalController,
} from './user-manual.controller';
import { UserManualService } from './user-manual.service';

describe('Manual HTTP integration with real session guards (isolated identities)', () => {
  let app: INestApplication;
  let jwt: JwtService;
  const originalSecret = process.env.JWT_SECRET;
  const db = {
    user: { findUnique: jest.fn() },
    clientUser: { findFirst: jest.fn() },
  };
  beforeAll(async () => {
    process.env.JWT_SECRET =
      'isolated-manual-http-test-secret-never-production';
    const mod = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({ secret: process.env.JWT_SECRET }),
      ],
      controllers: [UserManualInternalController, UserManualClientController],
      providers: [
        UserManualService,
        JwtStrategy,
        ClientJwtGuard,
        { provide: PrismaService, useValue: db },
      ],
    }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    jwt = mod.get(JwtService);
  });
  beforeEach(() => {
    db.user.findUnique.mockResolvedValue({
      id: 'manual-test-internal',
      email: 'internal@example.invalid',
      organizationId: 'isolated-org',
      role: 'ADVISOR',
      isActive: true,
      authVersion: 1,
    });
    db.clientUser.findFirst.mockResolvedValue({ sessionVersion: 1 });
  });
  afterAll(async () => {
    await app?.close();
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });
  const internal = () =>
    jwt.sign({ sub: 'manual-test-internal', authVersion: 1 });
  const client = () =>
    jwt.sign({
      sub: 'manual-test-client',
      type: 'CLIENT',
      sessionVersion: 1,
      organizationId: 'isolated-org',
    });
  it('rejects anonymous access to all read and help endpoints', async () => {
    for (const prefix of [
      '/api/user-manual',
      '/api/client-portal/user-manual',
    ]) {
      await request(app.getHttpServer()).get(prefix).expect(401);
      await request(app.getHttpServer())
        .get(prefix + '/knowledge')
        .expect(401);
      await request(app.getHttpServer())
        .post(prefix + '/ask')
        .send({ question: 'Knowledge' })
        .expect(401);
    }
  });
  it('serves internal approval instructions through authenticated HTTP', async () => {
    const r = await request(app.getHttpServer())
      .post('/api/user-manual/ask')
      .auth(internal(), { type: 'bearer' })
      .send({ question: 'Comment approuver un document ?' })
      .expect(201);
    expect(r.body.articles[0].id).toBe('approuver-document');
  });
  it('filters internal articles in client list, direct access and help search', async () => {
    const token = client();
    const r = await request(app.getHttpServer())
      .get('/api/client-portal/user-manual')
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(
      r.body.articles.some(
        (a) => a.id === 'commercial' || a.id === 'approuver-document',
      ),
    ).toBe(false);
    await request(app.getHttpServer())
      .get('/api/client-portal/user-manual/commercial')
      .auth(token, { type: 'bearer' })
      .expect(404);
    const help = await request(app.getHttpServer())
      .post('/api/client-portal/user-manual/ask')
      .auth(token, { type: 'bearer' })
      .send({ question: 'Comment utiliser Knowledge ?' })
      .expect(201);
    expect(help.body.articles[0].id).toBe('knowledge');
  });
  it('rejects cross-session types and revoked sessions', async () => {
    await request(app.getHttpServer())
      .get('/api/user-manual')
      .auth(client(), { type: 'bearer' })
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/client-portal/user-manual')
      .auth(internal(), { type: 'bearer' })
      .expect(401);
    db.clientUser.findFirst.mockResolvedValue({ sessionVersion: 2 });
    await request(app.getHttpServer())
      .get('/api/client-portal/user-manual')
      .auth(client(), { type: 'bearer' })
      .expect(401);
    db.user.findUnique.mockResolvedValue({ isActive: false, authVersion: 1 });
    await request(app.getHttpServer())
      .get('/api/user-manual')
      .auth(internal(), { type: 'bearer' })
      .expect(401);
  });
  it('validates input at HTTP boundary and abstains without invented instructions', async () => {
    await request(app.getHttpServer())
      .post('/api/user-manual/ask')
      .auth(internal(), { type: 'bearer' })
      .send({ question: { bad: 'input' } })
      .expect(400);
    const r = await request(app.getHttpServer())
      .post('/api/user-manual/ask')
      .auth(internal(), { type: 'bearer' })
      .send({ question: 'Comment piloter un hélicoptère ?' })
      .expect(201);
    expect(r.body).toMatchObject({
      status: 'INSUFFICIENT_EVIDENCE',
      articles: [],
      sourceType: 'PRODUCT_MANUAL',
    });
  });
});
