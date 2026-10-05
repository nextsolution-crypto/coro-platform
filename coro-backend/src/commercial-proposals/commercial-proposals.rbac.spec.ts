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
    if (!role) throw new UnauthorizedException();
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
    proposal: jest.fn(() =>
      Promise.resolve({
        id: 'proposal',
        reference: 'PROP-TEST',
        revisions: [{ oneTimeTotalMinor: '250000' }],
      }),
    ),
    updateFinalization: jest.fn(() => Promise.resolve({ lockVersion: 1 })),
  };
  const pdf = {
    download: jest.fn(() =>
      Promise.resolve({
        buffer: Buffer.from('%PDF-test'),
        mimeType: 'application/pdf',
        fileName: 'proposal.pdf',
      }),
    ),
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
        { provide: ProposalPdfService, useValue: pdf },
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
  ])('protects representative GET for role %s', async (role, expected) => {
    const call = request(app.getHttpServer()).get(
      '/admin/v1/commercial/proposals',
    );
    if (role) call.set('x-test-role', role);
    await call.expect(expected);
  });

  it.each([
    [undefined, 401],
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

  it.each([
    [undefined, 401],
    ['OPERATOR', 403],
    ['ADMIN', 403],
    ['SUPER_ADMIN', 200],
  ])('protects Proposal Detail for role %s', async (role, expected) => {
    const call = request(app.getHttpServer()).get(
      '/admin/v1/commercial/proposals/proposal',
    );
    if (role) call.set('x-test-role', role);
    const response = await call.expect(expected);
    if (role === 'SUPER_ADMIN') {
      const body = response.body as {
        revisions: Array<{ oneTimeTotalMinor: string }>;
      };
      expect(body.revisions[0].oneTimeTotalMinor).toBe('250000');
    }
  });

  it.each([
    [undefined, 401],
    ['OPERATOR', 403],
    ['ADMIN', 403],
    ['SUPER_ADMIN', 200],
  ])('protects private PDF download for role %s', async (role, expected) => {
    const call = request(app.getHttpServer()).get(
      '/admin/v1/commercial/proposals/proposal/revisions/revision/documents/document/download',
    );
    if (role) call.set('x-test-role', role);
    const response = await call.expect(expected);
    if (role === 'SUPER_ADMIN') {
      expect(response.headers['content-type']).toContain('application/pdf');
      expect(response.headers['content-disposition']).toContain('proposal.pdf');
    }
  });

  it.each([
    [undefined, 401],
    ['OPERATOR', 403],
    ['ADMIN', 403],
    ['SUPER_ADMIN', 200],
  ])('protects proposal finalization for role %s', async (role, expected) => {
    const call = request(app.getHttpServer())
      .put(
        '/admin/v1/commercial/proposals/proposal/revisions/revision/finalization',
      )
      .send({ lockVersion: 0, validUntil: '2026-12-31T00:00:00.000Z' });
    if (role) call.set('x-test-role', role);
    await call.expect(expected);
  });
});
