import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { PassportModule } from '@nestjs/passport';
import { PrismaClient, UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { JwtStrategy } from '../src/auth/jwt.strategy';
import { PlatformRolesGuard } from '../src/auth/platform-roles.guard';
import { legacyPlatformAuthorityTestProvider } from '../src/auth/platform-authority.test-provider';
import { Organization360Controller } from '../src/organization-360/organization-360.controller';
import { Organization360Service } from '../src/organization-360/organization-360.service';
import { PrismaService } from '../src/prisma/prisma.service';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl)
  throw new Error(
    'TEST_DATABASE_URL jetable est obligatoire pour organization-360-commercial.postgres-spec',
  );

const jwtSecret = 'organization-360-http-test-secret-32-characters';

describe('Organization 360 commercial HTTP PostgreSQL', () => {
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  const suffix = randomUUID();
  const exactMinor = 9007199254740993n;
  let app: INestApplication;
  let jwt: JwtService;
  let organizationId = '';
  let otherOrganizationId = '';
  let superAdminToken = '';
  let adminToken = '';
  let operatorToken = '';

  const token = (user: { id: string; authVersion: number }) =>
    jwt.sign({ sub: user.id, authVersion: user.authVersion });

  const counts = async () => ({
    organizations: await prisma.organization.count(),
    contracts: await prisma.organizationContract.count(),
    revisions: await prisma.organizationContractRevision.count(),
    priceLines: await prisma.contractPriceSnapshotLine.count(),
    proposals: await prisma.commercialProposal.count(),
    entitlements: await prisma.capabilityEntitlement.count(),
    auditEvents: await prisma.adminAuditEvent.count(),
  });

  beforeAll(async () => {
    process.env.JWT_SECRET = jwtSecret;
    await prisma.$connect();

    const [organization, otherOrganization] = await Promise.all([
      prisma.organization.create({
        data: { name: `Organization 360 BigInt ${suffix}` },
      }),
      prisma.organization.create({
        data: { name: `Organization 360 other ${suffix}` },
      }),
    ]);
    organizationId = organization.id;
    otherOrganizationId = otherOrganization.id;

    const [superAdmin, admin, operator] = await Promise.all([
      prisma.user.create({
        data: {
          email: `org360-super-${suffix}@example.invalid`,
          password: 'test-only',
          firstName: 'Super',
          lastName: 'Admin',
          role: UserRole.SUPER_ADMIN,
          organizationId: organization.id,
        },
      }),
      prisma.user.create({
        data: {
          email: `org360-admin-${suffix}@example.invalid`,
          password: 'test-only',
          firstName: 'Tenant',
          lastName: 'Admin',
          role: UserRole.ADMIN,
          organizationId: otherOrganization.id,
        },
      }),
      prisma.user.create({
        data: {
          email: `org360-operator-${suffix}@example.invalid`,
          password: 'test-only',
          firstName: 'Tenant',
          lastName: 'Operator',
          role: UserRole.OPERATOR,
          organizationId: otherOrganization.id,
        },
      }),
    ]);

    const capability = await prisma.commercialCapability.findUniqueOrThrow({
      where: { code: 'COMPLIANCE_OPERATIONS' },
    });
    const priceBook = await prisma.priceBook.create({
      data: {
        code: `ORG360_${suffix.replace(/-/g, '').slice(0, 16).toUpperCase()}`,
        name: 'Organization 360 BigInt test catalog',
        audience: 'DIRECT',
        currency: 'CAD',
      },
    });
    const priceBookVersion = await prisma.priceBookVersion.create({
      data: {
        priceBookId: priceBook.id,
        versionNumber: 1,
        effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
      },
    });
    const contract = await prisma.organizationContract.create({
      data: {
        organizationId: organization.id,
        reference: `ORG360-CONTRACT-${suffix}`,
        title: 'Organization 360 BigInt contract',
        status: 'DRAFT',
        isPrimary: true,
        revisions: {
          create: {
            revisionNumber: 1,
            revisionType: 'INITIAL',
            status: 'DRAFT',
            priceBookVersionId: priceBookVersion.id,
            currency: 'CAD',
            effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
            termStartAt: new Date('2026-01-01T00:00:00.000Z'),
            priceLines: {
              create: {
                source: 'CUSTOM_COMPONENT',
                capabilityId: capability.id,
                componentCode: 'ORG360_BIGINT',
                componentName: 'Organization 360 BigInt line',
                pricingModel: 'FLAT',
                chargeType: 'ONE_TIME',
                currency: 'CAD',
                catalogAmountMinor: exactMinor + 1n,
                contractAmountMinor: exactMinor,
                catalogExtendedAmountMinor: exactMinor + 2n,
                contractExtendedAmountMinor: exactMinor + 3n,
                quantity: '1',
                displayOrder: 1,
              },
            },
            commitments: {
              create: {
                type: 'MINIMUM_SPEND',
                period: 'CONTRACT_TERM',
                amountMinor: exactMinor + 4n,
                currency: 'CAD',
              },
            },
            adjustments: {
              create: {
                scope: 'CUSTOM_COMPONENT',
                adjustmentType: 'CUSTOM_FIXED_PRICE',
                capabilityId: capability.id,
                code: 'ORG360_ADJUSTMENT',
                label: 'Organization 360 adjustment',
                overrideAmountMinor: exactMinor + 5n,
                justification: 'Synthetic serialization proof',
                displayOrder: 1,
              },
            },
          },
        },
      },
      include: { revisions: { include: { priceLines: true } } },
    });
    const contractRevision = contract.revisions[0];
    const snapshotLine = contractRevision.priceLines[0];

    const proposal = await prisma.commercialProposal.create({
      data: {
        reference: `ORG360-PROP-${suffix}`,
        title: 'Organization 360 provenance proposal',
        organizationId: organization.id,
        status: 'OPEN',
        revisions: {
          create: {
            revisionNumber: 1,
            status: 'DRAFT',
            sourcePriceBookId: priceBook.id,
            sourcePriceBookVersionId: priceBookVersion.id,
            priceBookCodeSnapshot: priceBook.code,
            priceBookNameSnapshot: priceBook.name,
            priceBookVersionSnapshot: priceBookVersion.versionNumber,
            audienceSnapshot: priceBook.audience,
            relationshipSnapshot: 'DIRECT',
            currency: 'CAD',
            recipientLegalName: 'Synthetic recipient',
            recipientDisplayName: 'Synthetic recipient',
            recipientCountry: 'CA',
            recipientPreferredLanguage: 'FR',
            calculationVersion: 'organization-360-http-test/v1',
          },
        },
      },
      include: { revisions: true },
    });
    const proposalDocument = await prisma.proposalDocument.create({
      data: {
        proposalRevisionId: proposal.revisions[0].id,
        type: 'OFFER',
        language: 'FR',
        status: 'FINALIZED',
        fileName: 'synthetic-offer.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1,
        storageKey: `org360/${suffix}/synthetic-offer.pdf`,
        sha256: 'a'.repeat(64),
        templateVersion: 'organization-360-http-test/v1',
        generatorVersion: 'organization-360-http-test/v1',
        generationKey: `org360-generation-${suffix}`,
        generationStartedAt: new Date('2025-12-19T00:00:00.000Z'),
        generatedAt: new Date('2025-12-19T00:00:00.000Z'),
      },
    });
    await prisma.commercialProposalRevision.update({
      where: { id: proposal.revisions[0].id },
      data: {
        status: 'ACCEPTED',
        sentAt: new Date('2025-12-19T00:00:00.000Z'),
        sentDocumentId: proposalDocument.id,
        acceptedAt: new Date('2025-12-20T00:00:00.000Z'),
        acceptanceOccurredAt: new Date('2025-12-20T00:00:00.000Z'),
        acceptedByName: 'Synthetic customer',
        acceptedByAuthority: 'Authorized synthetic signer',
        acceptanceReference: `SYNTHETIC-ACCEPTANCE-${suffix}`,
        lifecycleReason: 'Synthetic acceptance evidence',
        lockVersion: 1,
      },
    });
    await prisma.commercialProposal.update({
      where: { id: proposal.id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date('2025-12-20T00:00:00.000Z'),
        acceptedRevisionId: proposal.revisions[0].id,
        lockVersion: 1,
      },
    });
    await prisma.organizationContractRevision.update({
      where: { id: contractRevision.id },
      data: {
        sourceProposalRevisionId: proposal.revisions[0].id,
        status: 'SIGNED',
        signedAt: new Date('2026-01-01T00:00:00.000Z'),
        signedByName: 'Synthetic signer',
        signatureReference: `SYNTHETIC-${suffix}`,
      },
    });
    await prisma.organizationContract.update({
      where: { id: contract.id },
      data: {
        status: 'ACTIVE',
        activatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    });
    await prisma.capabilityEntitlement.create({
      data: {
        organizationId: organization.id,
        capabilityId: capability.id,
        scope: 'ORGANIZATION',
        source: 'CONTRACT',
        sourceContractId: contract.id,
        sourceContractRevisionId: contractRevision.id,
        sourceSnapshotLineId: snapshotLine.id,
        revisions: {
          create: {
            versionNumber: 1,
            lifecycle: 'GRANTED',
            enabled: true,
            distributable: false,
            decisionAt: new Date('2026-01-01T00:00:00.000Z'),
            effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
            reason: 'Synthetic contract entitlement',
          },
        },
      },
    });

    const module = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({
          secret: jwtSecret,
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [Organization360Controller],
      providers: [
        Reflector,
        PlatformRolesGuard,
        legacyPlatformAuthorityTestProvider,
        JwtStrategy,
        Organization360Service,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
    jwt = module.get(JwtService);
    superAdminToken = token(superAdmin);
    adminToken = token(admin);
    operatorToken = token(operator);
  });

  afterAll(async () => {
    if (app) await app.close();
    await prisma.$disconnect();
  });

  it('serializes exact contract snapshot BigInts and preserves commercial continuity without GET mutations', async () => {
    const before = await counts();
    const response = await request(app.getHttpServer())
      .get(`/admin/v1/organizations/${organizationId}/commercial`)
      .auth(superAdminToken, { type: 'bearer' })
      .expect(200);
    const body = response.body as {
      contracts: Array<{
        revisions: Array<{
          sourceProposalRevisionId: string | null;
          priceLines: Array<Record<string, unknown>>;
          commitments: Array<Record<string, unknown>>;
          adjustments: Array<Record<string, unknown>>;
        }>;
      }>;
      proposals: Array<{ acceptedRevisionId: string | null }>;
      continuity: {
        contractedCapabilities: Array<{ code: string; state: string }>;
      };
    };
    const revision = body.contracts[0].revisions[0];
    expect(revision.priceLines[0]).toMatchObject({
      catalogAmountMinor: (exactMinor + 1n).toString(),
      contractAmountMinor: exactMinor.toString(),
      catalogExtendedAmountMinor: (exactMinor + 2n).toString(),
      contractExtendedAmountMinor: (exactMinor + 3n).toString(),
    });
    expect(revision.commitments[0].amountMinor).toBe(
      (exactMinor + 4n).toString(),
    );
    expect(revision.adjustments[0].overrideAmountMinor).toBe(
      (exactMinor + 5n).toString(),
    );
    expect(revision.sourceProposalRevisionId).toBeTruthy();
    expect(body.proposals[0].acceptedRevisionId).toBeTruthy();
    expect(body.continuity.contractedCapabilities).toContainEqual(
      expect.objectContaining({
        code: 'COMPLIANCE_OPERATIONS',
        state: 'ACTIVE',
      }),
    );
    expect(await counts()).toEqual(before);
  });

  it.each([
    ['unauthenticated', '', 401],
    ['ADMIN from another tenant', 'admin', 403],
    ['OPERATOR from another tenant', 'operator', 403],
  ])(
    'rejects %s without leaking commercial data or mutating state',
    async (_label, tokenKind, status) => {
      const before = await counts();
      const call = request(app.getHttpServer()).get(
        `/admin/v1/organizations/${organizationId}/commercial`,
      );
      if (tokenKind === 'admin') call.auth(adminToken, { type: 'bearer' });
      if (tokenKind === 'operator')
        call.auth(operatorToken, { type: 'bearer' });
      const response = await call.expect(status);
      expect(JSON.stringify(response.body)).not.toContain(
        exactMinor.toString(),
      );
      expect(JSON.stringify(response.body)).not.toContain(organizationId);
      expect(JSON.stringify(response.body)).not.toContain(otherOrganizationId);
      expect(await counts()).toEqual(before);
    },
  );
});
