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
jest.mock('puppeteer', () => ({ __esModule: true, default: {} }));
import { PlatformRolesGuard } from '../auth/platform-roles.guard';
import { ProposalDocumentCompositionController } from './proposal-document-composition.controller';
import { ProposalDocumentCompositionService } from './proposal-document-composition.service';
import { GovernedProposalPdfService } from './governed-proposal-pdf.service';

class HeaderGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: { userId: string; role: UserRole };
    }>();
    const role = request.headers['x-test-role'];
    if (!role) throw new UnauthorizedException();
    request.user = { userId: 'actor', role: role as UserRole };
    return true;
  }
}

describe('Proposal document composition HTTP RBAC', () => {
  let app: INestApplication;
  const service = {
    composeInternalDraft: jest.fn(() => ({ id: 'snapshot' })),
    history: jest.fn(() => []),
    metadata: jest.fn(() => ({ id: 'snapshot' })),
  };
  const pdf = {
    generate: jest.fn(() => ({ id: 'document' })),
    download: jest.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ProposalDocumentCompositionController],
      providers: [
        Reflector,
        PlatformRolesGuard,
        { provide: ProposalDocumentCompositionService, useValue: service },
        { provide: GovernedProposalPdfService, useValue: pdf },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useClass(HeaderGuard)
      .compile();
    app = module.createNestApplication();
    await app.init();
  });

  it.each([
    [undefined, 401],
    ['OPERATOR', 403],
    ['ADMIN', 403],
    ['SUPER_ADMIN', 201],
  ])('protects governed PDF generation for %s', async (role, expected) => {
    const call = request(app.getHttpServer() as Server)
      .post(
        '/admin/v1/commercial/proposals/p/revisions/r/document-compositions/s/generate-pdf-v2',
      )
      .send({ idempotencyKey: 'test-key' });
    if (role) call.set('x-test-role', role);
    await call.expect(expected);
  });

  afterAll(async () => app.close());

  it.each([
    [undefined, 401],
    ['OPERATOR', 403],
    ['ADMIN', 403],
    ['SUPER_ADMIN', 201],
  ])('protects composition for %s', async (role, expected) => {
    const call = request(app.getHttpServer() as Server)
      .post(
        '/admin/v1/commercial/proposals/p/revisions/r/document-compositions',
      )
      .send({ templateCode: 'CORO_PROFESSIONAL', language: 'FR' });
    if (role) call.set('x-test-role', role);
    await call.expect(expected);
  });

  it.each([
    [undefined, 401],
    ['OPERATOR', 403],
    ['ADMIN', 403],
    ['SUPER_ADMIN', 200],
  ])('protects snapshot history for %s', async (role, expected) => {
    const call = request(app.getHttpServer() as Server).get(
      '/admin/v1/commercial/proposals/p/revisions/r/document-compositions',
    );
    if (role) call.set('x-test-role', role);
    await call.expect(expected);
  });
});
