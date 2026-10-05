import 'reflect-metadata';
import {
  CanActivate,
  Body,
  Controller,
  ExecutionContext,
  INestApplication,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { AuthGuard } from '@nestjs/passport';
import { PrismaClient, UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { AdminAuditService } from '../src/admin-audit/admin-audit.service';
import { SuperAdminOnly } from '../src/auth/platform-roles.decorator';
import { PlatformRolesGuard } from '../src/auth/platform-roles.guard';
import { CommercialProposalsService } from '../src/commercial-proposals/commercial-proposals.service';
import { ProposalPricingEngine } from '../src/commercial-proposals/proposal-pricing-engine';
import { TransitionProposalDto } from '../src/commercial-proposals/dto/commercial-proposals.dto';
import { CommercialSimulatorService } from '../src/commercial-simulator/commercial-simulator.service';

const url = process.env.TEST_DATABASE_URL;
if (!url)
  throw new Error(
    'TEST_DATABASE_URL jetable est obligatoire pour commercial-guided-quantity.postgres-spec',
  );

type QuantityLine = {
  componentCode: string;
  quantity: { toString(): string } | null;
  quantityUnit: string | null;
  commercialQuantityBasis: 'DECLARED' | 'METERED' | null;
  commercialRuleCode: string | null;
  commercialRuleVersion: string | null;
};

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

@Controller('admin/v1/commercial/proposals')
@UseGuards(AuthGuard('jwt'), PlatformRolesGuard)
@SuperAdminOnly()
class ReadyLifecycleController {
  constructor(private readonly service: CommercialProposalsService) {}

  @Post(':proposalId/revisions/:revisionId/mark-ready')
  ready(
    @Param('revisionId') revisionId: string,
    @Body() dto: TransitionProposalDto,
    @Req() req: { user: { userId: string } },
  ) {
    return this.service.transition(revisionId, 'READY', dto, req.user);
  }
}

describe('guided commercial quantity provenance PostgreSQL lifecycle', () => {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const audit = new AdminAuditService();
  const pricing = new ProposalPricingEngine();
  const simulator = new CommercialSimulatorService(
    prisma as never,
    pricing,
    audit,
  );
  const proposals = new CommercialProposalsService(
    prisma as never,
    audit,
    pricing,
  );
  let app: INestApplication;

  beforeAll(async () => {
    await prisma.$connect();
    const module = await Test.createTestingModule({
      controllers: [ReadyLifecycleController],
      providers: [
        Reflector,
        PlatformRolesGuard,
        { provide: CommercialProposalsService, useValue: proposals },
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

  it('preserves DECLARED from guided Scenario through Run and Proposal, then reaches READY over authenticated HTTP', async () => {
    const suffix = randomUUID();
    const organization = await prisma.organization.create({
      data: { name: `FIX05 ${suffix}` },
    });
    const actor = await prisma.user.create({
      data: {
        email: `fix05-${suffix}@example.invalid`,
        password: 'test-only',
        firstName: 'Fix',
        lastName: 'Five',
        role: 'SUPER_ADMIN',
        organizationId: organization.id,
      },
    });
    const capability = await prisma.commercialCapability.findUniqueOrThrow({
      where: { code: 'COMPLIANCE_OPERATIONS' },
    });
    const book = await prisma.priceBook.create({
      data: {
        code: `FIX05_${suffix.replace(/-/g, '').slice(0, 16).toUpperCase()}`,
        name: 'FIX05 disposable catalog',
        audience: 'DIRECT',
        currency: 'CAD',
      },
    });
    const version = await prisma.priceBookVersion.create({
      data: {
        priceBookId: book.id,
        versionNumber: 1,
        effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
      },
    });
    const [subscription, implementation] = await Promise.all([
      prisma.priceComponent.create({
        data: {
          priceBookVersionId: version.id,
          capabilityId: capability.id,
          code: 'DOCUMENT_COMPLIANCE_SUBSCRIPTION',
          nameFr: 'Abonnement',
          nameEn: 'Subscription',
          pricingModel: 'FLAT',
          chargeType: 'RECURRING',
          revenueCategory: 'SAAS',
          billingPeriod: 'MONTH',
          metric: 'FIXED',
          amountMinor: 50_000n,
          displayOrder: 1,
        },
      }),
      prisma.priceComponent.create({
        data: {
          priceBookVersionId: version.id,
          capabilityId: capability.id,
          code: 'DOCUMENT_COMPLIANCE_IMPLEMENTATION',
          nameFr: 'Implémentation',
          nameEn: 'Implementation',
          pricingModel: 'FLAT',
          chargeType: 'ONE_TIME',
          revenueCategory: 'IMPLEMENTATION',
          metric: 'FIXED',
          amountMinor: 250_000n,
          displayOrder: 2,
        },
      }),
    ]);
    const workspace = await prisma.commercialSimulationWorkspace.create({
      data: {
        reference: `FIX05-${suffix}`,
        title: 'FIX05 disposable workspace',
        organizationId: organization.id,
        priceBookVersionId: version.id,
        currency: 'CAD',
        createdByUserId: actor.id,
      },
    });
    const scenario = await prisma.commercialSimulationScenario.create({
      data: { workspaceId: workspace.id, name: 'Scenario B' },
    });

    await simulator.configureGuidedScenario(
      workspace.id,
      scenario.id,
      {
        lockVersion: 0,
        familyCodes: ['COMPLIANCE'],
        catalogLines: [subscription, implementation].map((component) => ({
          priceComponentId: component.id,
          quantity: '1',
          commercialQuantityBasis: 'DECLARED' as const,
        })),
        customLines: [],
        driverValues: [],
      },
      { userId: actor.id },
    );
    await simulator.selectScenario(
      workspace.id,
      { scenarioId: scenario.id, lockVersion: 0 },
      { userId: actor.id },
    );
    const run = await simulator.calculateGuided(
      workspace.id,
      scenario.id,
      {},
      { userId: actor.id },
    );
    const conversion = await simulator.convertGuided(
      workspace.id,
      scenario.id,
      run.id,
      {
        title: 'FIX05 guided proposal',
        relationship: 'DIRECT',
        preferredLanguage: 'FR',
        recipientLegalName: 'FIX05 customer',
        recipientDisplayName: 'FIX05 customer',
        recipientCountry: 'CA',
      },
      { userId: actor.id },
    );

    const scenarioLines =
      await prisma.commercialSimulationScenarioLine.findMany({
        where: { scenarioId: scenario.id },
        orderBy: { displayOrder: 'asc' },
      });
    const runLines = await prisma.commercialSimulationRunLine.findMany({
      where: { runId: run.id },
      orderBy: { displayOrder: 'asc' },
    });
    const proposalLines = await prisma.proposalLine.findMany({
      where: { proposalRevisionId: conversion.proposalRevision.id },
      orderBy: { displayOrder: 'asc' },
    });
    for (const lines of [
      scenarioLines as QuantityLine[],
      runLines as QuantityLine[],
      proposalLines as QuantityLine[],
    ])
      expect(
        lines.map((line) => ({
          code: line.componentCode,
          quantity: line.quantity?.toString(),
          quantityUnit: line.quantityUnit,
          basis: line.commercialQuantityBasis,
          ruleCode: line.commercialRuleCode,
          ruleVersion: line.commercialRuleVersion,
        })),
      ).toEqual([
        {
          code: 'DOCUMENT_COMPLIANCE_SUBSCRIPTION',
          quantity: '1',
          quantityUnit: 'FIXED',
          basis: 'DECLARED',
          ruleCode: null,
          ruleVersion: null,
        },
        {
          code: 'DOCUMENT_COMPLIANCE_IMPLEMENTATION',
          quantity: '1',
          quantityUnit: 'FIXED',
          basis: 'DECLARED',
          ruleCode: null,
          ruleVersion: null,
        },
      ]);

    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const response = await request(server)
      .post(
        `/admin/v1/commercial/proposals/${conversion.proposal.id}/revisions/${conversion.proposalRevision.id}/mark-ready`,
      )
      .set('x-test-role', 'SUPER_ADMIN')
      .set('x-test-user', actor.id)
      .send({ lockVersion: 0, reason: 'FIX05 authenticated READY proof' })
      .expect(201);
    expect(response.body).toMatchObject({ status: 'READY', lockVersion: 1 });

    const entitlementCount = await prisma.capabilityEntitlement.count({
      where: { organizationId: organization.id },
    });
    const meteringCount = await prisma.meteringResult.count({
      where: { organizationId: organization.id },
    });
    expect({ entitlementCount, meteringCount }).toEqual({
      entitlementCount: 0,
      meteringCount: 0,
    });
  });

  it('keeps READY rejection for an applicable Proposal line with missing provenance', async () => {
    const revision = await prisma.commercialProposalRevision.findFirstOrThrow({
      where: { status: 'READY' },
      include: { proposal: true, lines: true },
      orderBy: { createdAt: 'desc' },
    });
    const draft = await prisma.commercialProposalRevision.create({
      data: {
        proposalId: revision.proposalId,
        revisionNumber: revision.revisionNumber + 1,
        sourcePriceBookId: revision.sourcePriceBookId,
        sourcePriceBookVersionId: revision.sourcePriceBookVersionId,
        relationshipSnapshot: revision.relationshipSnapshot,
        currency: revision.currency,
        recipientLegalName: revision.recipientLegalName,
        recipientDisplayName: revision.recipientDisplayName,
        recipientCountry: revision.recipientCountry,
        recipientPreferredLanguage: revision.recipientPreferredLanguage,
        calculationVersion: revision.calculationVersion,
        createdByUserId: revision.createdByUserId,
        lines: {
          create: revision.lines.map((line) => ({
            source: line.source,
            sourcePriceComponentId: line.sourcePriceComponentId,
            capabilityId: line.capabilityId,
            componentCode: `${line.componentCode}_MISSING_${randomUUID().slice(0, 6)}`,
            componentNameFR: line.componentNameFR,
            pricingModel: line.pricingModel,
            chargeType: line.chargeType,
            revenueCategory: line.revenueCategory,
            billingPeriod: line.billingPeriod,
            metric: line.metric,
            quantity: line.quantity,
            quantityUnit: line.quantityUnit,
            proposedUnitAmountMinor: line.proposedUnitAmountMinor,
            proposedExtendedAmountMinor: line.proposedExtendedAmountMinor,
            calculationStatus: line.calculationStatus,
            calculationExplanationFR: line.calculationExplanationFR,
            displayOrder: line.displayOrder,
          })),
        },
      },
    });
    const actor = await prisma.user.findUniqueOrThrow({
      where: { id: draft.createdByUserId! },
    });
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const response = await request(server)
      .post(
        `/admin/v1/commercial/proposals/${revision.proposalId}/revisions/${draft.id}/mark-ready`,
      )
      .set('x-test-role', 'SUPER_ADMIN')
      .set('x-test-user', actor.id)
      .send({ lockVersion: 0, reason: 'FIX05 negative READY proof' })
      .expect(400);
    expect(JSON.stringify(response.body)).toContain(
      'source de quantité commerciale explicite',
    );
  });
});
