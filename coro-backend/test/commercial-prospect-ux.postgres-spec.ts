import 'reflect-metadata';
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { AuthGuard } from '@nestjs/passport';
import { PrismaClient, UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import request from 'supertest';
jest.mock('puppeteer', () => ({ __esModule: true, default: {} }));
import { AdminAuditService } from '../src/admin-audit/admin-audit.service';
import { PlatformRolesGuard } from '../src/auth/platform-roles.guard';
import { CommercialProspectsController } from '../src/commercial-proposals/commercial-proposals.controller';
import { CommercialProposalsService } from '../src/commercial-proposals/commercial-proposals.service';
import { ProposalPricingEngine } from '../src/commercial-proposals/proposal-pricing-engine';
import { CommercialSimulatorController } from '../src/commercial-simulator/commercial-simulator.controller';
import { CommercialSimulatorService } from '../src/commercial-simulator/commercial-simulator.service';

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error('TEST_DATABASE_URL jetable est obligatoire.');

class HeaderAuthenticationGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: { userId: string; role: UserRole };
    }>();
    const role = req.headers['x-test-role'];
    const userId = req.headers['x-test-user'];
    if (!role || !userId) throw new UnauthorizedException();
    req.user = { userId, role: role as UserRole };
    return true;
  }
}

describe('Founder Prospect UX PostgreSQL HTTP acceptance', () => {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const audit = new AdminAuditService();
  const pricing = new ProposalPricingEngine();
  const proposals = new CommercialProposalsService(
    prisma as never,
    audit,
    pricing,
  );
  const simulator = new CommercialSimulatorService(
    prisma as never,
    pricing,
    audit,
  );
  const suffix = randomUUID();
  const reference = `TEST-BOREAL-${suffix}`;
  let app: INestApplication;
  let actorId = '';
  let prospectId = '';

  beforeAll(async () => {
    await prisma.$connect();
    const organization = await prisma.organization.create({
      data: { name: `Prospect UX ${suffix}` },
    });
    actorId = (
      await prisma.user.create({
        data: {
          email: `prospect-ux-${suffix}@example.invalid`,
          password: 'test-only',
          firstName: 'Founder',
          lastName: 'Test',
          role: 'SUPER_ADMIN',
          organizationId: organization.id,
        },
      })
    ).id;
    const module = await Test.createTestingModule({
      controllers: [
        CommercialProspectsController,
        CommercialSimulatorController,
      ],
      providers: [
        Reflector,
        PlatformRolesGuard,
        { provide: CommercialProposalsService, useValue: proposals },
        { provide: CommercialSimulatorService, useValue: simulator },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useClass(HeaderAuthenticationGuard)
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it.each([
    [undefined, 401],
    ['OPERATOR', 403],
    ['ADMIN', 403],
  ])('refuses Prospect creation for %s', async (role, expected) => {
    const call = request(app.getHttpServer())
      .post('/admin/v1/commercial/prospects')
      .send({});
    if (role) call.set('x-test-role', role).set('x-test-user', actorId);
    await call.expect(expected);
  });

  it.each([
    [undefined, 401],
    ['OPERATOR', 403],
    ['ADMIN', 403],
  ])('refuses Prospect reads for %s', async (role, expected) => {
    const call = request(app.getHttpServer()).get(
      '/admin/v1/commercial/prospects',
    );
    if (role) call.set('x-test-role', role).set('x-test-user', actorId);
    await call.expect(expected);
  });

  it.each([
    [undefined, 401],
    ['OPERATOR', 403],
    ['ADMIN', 403],
  ])('refuses Prospect updates for %s', async (role, expected) => {
    const call = request(app.getHttpServer())
      .patch(`/admin/v1/commercial/prospects/${randomUUID()}`)
      .send({});
    if (role) call.set('x-test-role', role).set('x-test-user', actorId);
    await call.expect(expected);
  });

  it('creates, reads and audits a synthetic Prospect as the authenticated SUPER_ADMIN', async () => {
    const before = {
      workspaces: await prisma.commercialSimulationWorkspace.count(),
      proposals: await prisma.commercialProposal.count(),
      organizations: await prisma.organization.count(),
    };
    const response = await request(app.getHttpServer())
      .post('/admin/v1/commercial/prospects')
      .set('x-test-role', 'SUPER_ADMIN')
      .set('x-test-user', actorId)
      .send({
        reference,
        legalName: 'Groupe Boréal Services Conseils — TEST',
        displayName: 'Groupe Boréal — TEST',
        preferredLanguage: 'FR',
        country: 'CA',
        contactEmail: 'commercial-test@example.invalid',
      })
      .expect(201);
    const created = response.body as { id: string; status: string };
    prospectId = created.id;
    expect(created.status).toBe('ACTIVE');
    await request(app.getHttpServer())
      .get(`/admin/v1/commercial/prospects/${prospectId}`)
      .set('x-test-role', 'SUPER_ADMIN')
      .set('x-test-user', actorId)
      .expect(200)
      .expect(({ body }) =>
        expect((body as { reference: string }).reference).toBe(reference),
      );
    const event = await prisma.adminAuditEvent.findFirstOrThrow({
      where: { action: 'PROSPECT_CREATED', targetId: prospectId },
    });
    expect(event.actorUserId).toBe(actorId);
    expect(await prisma.commercialSimulationWorkspace.count()).toBe(
      before.workspaces,
    );
    expect(await prisma.commercialProposal.count()).toBe(before.proposals);
    expect(await prisma.organization.count()).toBe(before.organizations);
  });

  it('rejects an exact duplicate reference with 409', async () => {
    await request(app.getHttpServer())
      .post('/admin/v1/commercial/prospects')
      .set('x-test-role', 'SUPER_ADMIN')
      .set('x-test-user', actorId)
      .send({
        reference,
        legalName: 'Duplicate',
        displayName: 'Duplicate',
        preferredLanguage: 'FR',
        country: 'CA',
      })
      .expect(409);
    await expect(
      prisma.commercialProspect.count({ where: { reference } }),
    ).resolves.toBe(1);
  });

  it('updates a non-critical field while preserving reference and audit actor', async () => {
    await request(app.getHttpServer())
      .patch(`/admin/v1/commercial/prospects/${prospectId}`)
      .set('x-test-role', 'SUPER_ADMIN')
      .set('x-test-user', actorId)
      .send({
        legalName: 'Groupe Boréal Services Conseils — TEST',
        displayName: 'Groupe Boréal Services — TEST',
        preferredLanguage: 'FR',
        country: 'CA',
        contactEmail: 'commercial-test@example.invalid',
      })
      .expect(200)
      .expect(({ body }) => {
        const updated = body as { reference: string; displayName: string };
        expect(updated.reference).toBe(reference);
        expect(updated.displayName).toBe('Groupe Boréal Services — TEST');
      });
    const event = await prisma.adminAuditEvent.findFirstOrThrow({
      where: { action: 'PROSPECT_UPDATED', targetId: prospectId },
    });
    expect(event.actorUserId).toBe(actorId);
  });

  it('returns the new Prospect from the canonical Configurator lookup by name and reference', async () => {
    for (const search of ['Boréal', reference]) {
      const response = await request(app.getHttpServer())
        .get('/admin/v1/commercial/simulator/configurator/targets/prospects')
        .query({ search })
        .set('x-test-role', 'SUPER_ADMIN')
        .set('x-test-user', actorId)
        .expect(200);
      const body = response.body as {
        items: Array<{
          id: string;
          reference: string;
          selectable: boolean;
        }>;
      };
      expect(
        body.items.filter((item: { id: string }) => item.id === prospectId),
      ).toHaveLength(1);
      expect(body.items.find((item) => item.id === prospectId)).toMatchObject({
        id: prospectId,
        reference,
        selectable: true,
      });
    }
  });
});
