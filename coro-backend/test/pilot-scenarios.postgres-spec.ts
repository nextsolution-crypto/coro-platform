import { BadRequestException } from '@nestjs/common';
import {
  PilotCheckStatus,
  PilotRunEnvironment,
  PrismaClient,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { AdminAuditService } from '../src/admin-audit/admin-audit.service';
import { PilotScenariosService } from '../src/pilot-scenarios/pilot-scenarios.service';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;

jest.setTimeout(60_000);

describePostgres('Pilot scenario registry on PostgreSQL', () => {
  const prisma = databaseUrl
    ? new PrismaClient({ datasources: { db: { url: databaseUrl } } })
    : new PrismaClient();
  const service = new PilotScenariosService(
    prisma as never,
    new AdminAuditService(),
  );

  afterAll(async () => prisma.$disconnect());

  it('registers only active governed demo targets and keeps evidence auditable', async () => {
    const marker = randomUUID();
    const organization = await prisma.organization.create({
      data: { name: `CORO Demo QA ${marker}` },
    });
    const actor = await prisma.user.create({
      data: {
        email: `pilot-${marker}@qa.invalid`,
        password: 'not-a-login-secret',
        firstName: 'QA',
        lastName: 'Pilot',
        role: 'ADMIN',
        organizationId: organization.id,
      },
    });
    const client = await prisma.client.create({
      data: {
        name: `Client ${marker}`,
        regulatoryRequirements: [],
        organizationId: organization.id,
      },
    });
    const building = await prisma.building.create({
      data: {
        name: `Tour QA ${marker}`,
        address: '100, rue Synthétique',
        city: 'Montréal',
        province: 'QC',
        organizationId: organization.id,
        clientId: client.id,
      },
    });
    const project = await prisma.project.create({
      data: {
        name: `PMU pilote ${marker}`,
        documentType: 'PMU',
        year: 2026,
        organizationId: organization.id,
        clientId: client.id,
        buildingId: building.id,
        userId: actor.id,
      },
    });
    const otherOrganization = await prisma.organization.create({
      data: { name: `Autre tenant ${marker}` },
    });

    const dto = {
      scenarioKey: `TOUR_PREMONT_${marker.replaceAll('-', '').slice(0, 12).toUpperCase()}`,
      name: 'Pilote bout en bout Tour Prémont',
      organizationId: organization.id,
      buildingId: building.id,
      projectId: project.id,
      reason: 'Preuve PostgreSQL du registre pilote.',
    };

    await expect(
      service.create(dto, { userId: actor.id, role: actor.role }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await prisma.demoEnvironment.create({
      data: {
        organizationId: organization.id,
        fixtureNamespace: `pilot-${marker}`,
        referenceEmailHash: 'a'.repeat(64),
        status: 'PAUSED',
      },
    });
    await expect(
      service.create(dto, { userId: actor.id, role: actor.role }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await prisma.demoEnvironment.update({
      where: { organizationId: organization.id },
      data: { status: 'ACTIVE' },
    });
    const eligibleTargets = await service.eligibleTargets();
    const eligibleOrganization = eligibleTargets.find(
      (target) => target.id === organization.id,
    );
    expect(eligibleOrganization?.buildings).toEqual([
      expect.objectContaining({ id: building.id }),
    ]);
    expect(eligibleOrganization?.projects).toEqual([
      expect.objectContaining({ id: project.id, buildingId: building.id }),
    ]);
    expect(
      eligibleTargets.some((target) => target.id === otherOrganization.id),
    ).toBe(false);
    await expect(
      service.create(
        { ...dto, organizationId: otherOrganization.id },
        { userId: actor.id, role: actor.role },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    const scenario = await service.create(dto, {
      userId: actor.id,
      role: actor.role,
    });
    const run = await service.createRun(
      scenario.id,
      {
        environment: PilotRunEnvironment.QA,
        sourceCommit: '4e68328fcf2467f1e5c18c5e91975504fe2d4600',
        reason: 'Démarrage de la campagne QA PostgreSQL.',
      },
      { userId: actor.id, role: actor.role },
    );
    expect(run.checks.length).toBeGreaterThanOrEqual(50);

    const updated = await service.updateCheck(
      scenario.id,
      run.id,
      run.checks[0].checkKey,
      {
        status: PilotCheckStatus.PASS,
        notes: 'Contrôle exécuté sur fixture synthétique.',
        evidence: { type: 'postgres', synthetic: true },
        reason: 'Enregistrement de la preuve synthétique.',
      },
      { userId: actor.id, role: actor.role },
    );
    expect(updated.observedById).toBe(actor.id);
    expect(updated.evidence).toEqual({ type: 'postgres', synthetic: true });

    const completed = await service.completeRun(
      scenario.id,
      run.id,
      { reason: 'Clôture volontaire avec contrôles encore ouverts.' },
      { userId: actor.id, role: actor.role },
    );
    expect(completed.status).toBe('PARTIAL');
    expect(
      await prisma.adminAuditEvent.count({
        where: {
          targetId: { in: [scenario.id, run.id, updated.id] },
          action: { startsWith: 'PILOT_SCENARIO_' },
        },
      }),
    ).toBe(4);
  });
});
