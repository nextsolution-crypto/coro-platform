import {
  CanActivate,
  ExecutionContext,
  INestApplication,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import request from 'supertest';
import { PlatformRolesGuard } from '../auth/platform-roles.guard';
import {
  CommercialProposalsController,
  CommercialProspectsController,
} from './commercial-proposals.controller';
import { CommercialProposalsService } from './commercial-proposals.service';
import { ProposalPdfService } from './proposal-pdf.service';

jest.mock('puppeteer', () => ({ __esModule: true, default: {} }));

class HeaderAuthenticationGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: { userId: string; role: UserRole };
    }>();
    const role = req.headers['x-test-role'];
    if (!role) return false;
    req.user = { userId: 'test-user', role: role as UserRole };
    return true;
  }
}

describe('Commercial proposals effective HTTP RBAC', () => {
  let app: INestApplication;
  const service = {
    listProposals: jest.fn(() => Promise.resolve([])),
    createProposal: jest.fn(() => Promise.resolve({ id: 'proposal' })),
    listProspects: jest.fn(() => Promise.resolve([])),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [
        CommercialProposalsController,
        CommercialProspectsController,
      ],
      providers: [
        Reflector,
        PlatformRolesGuard,
        { provide: CommercialProposalsService, useValue: service },
        { provide: ProposalPdfService, useValue: {} },
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
    [undefined, 403],
    ['OPERATOR', 403],
    ['ADMIN', 403],
    ['SUPER_ADMIN', 200],
  ])('protects representative GET for role %s', async (role, expected) => {
    const call = request(app.getHttpServer()).get(
      '/admin/v1/commercial/proposals',
    );
    if (role) call.set('x-test-role', role);
    await call.expect(expected);
  });

  it.each([
    [undefined, 403],
    ['OPERATOR', 403],
    ['ADMIN', 403],
    ['SUPER_ADMIN', 201],
  ])('protects representative POST for role %s', async (role, expected) => {
    const call = request(app.getHttpServer())
      .post('/admin/v1/commercial/proposals')
      .send({});
    if (role) call.set('x-test-role', role);
    await call.expect(expected);
  });
});
