/// <reference path="../../coro-backend/node_modules/@types/jest/index.d.ts" />
import { PrismaClient } from '../../coro-backend/node_modules/@prisma/client';
import { GeneratorService } from '../../coro-backend/src/generator/generator.service';
import { ValidationService } from '../../coro-backend/src/generator/validation.service';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) throw new Error('TEST_DATABASE_URL jetable est obligatoire');

describe('Non-regression de la generation documentaire gouvernee', () => {
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const prefix = `docgen-${Date.now()}`;
  const ids = {
    orgA: `${prefix}-org-a`, orgB: `${prefix}-org-b`,
    operatorA: `${prefix}-operator-a`, operatorC: `${prefix}-operator-c`, operatorB: `${prefix}-operator-b`,
    clientA: `${prefix}-client-a`, clientB: `${prefix}-client-b`,
    buildingA: `${prefix}-building-a`, buildingB: `${prefix}-building-b`,
    pmu: `${prefix}-pmu`, psi: `${prefix}-psi`, pca: `${prefix}-pca`,
    archived: `${prefix}-archived`, inactive: `${prefix}-inactive`, failure: `${prefix}-failure`,
    concurrent: `${prefix}-concurrent`, retry: `${prefix}-retry`, incompatible: `${prefix}-incompatible`,
  };
  const actorA = { userId: ids.operatorA, organizationId: ids.orgA, role: 'OPERATOR' };
  const actorC = { userId: ids.operatorC, organizationId: ids.orgA, role: 'OPERATOR' };
  const actorB = { userId: ids.operatorB, organizationId: ids.orgB, role: 'OPERATOR' };
  // Generation-only scenarios do not exercise the editor collaborators, but
  // the final integration constructor contract must remain explicit.
  const service = new GeneratorService(
    prisma as any,
    undefined as any,
    undefined as any,
  );
  const validation = new ValidationService(prisma as any);
  const command = (key: string, expectedDocumentVersion = 0) => ({
    idempotencyKey: `docgen-${key}-${prefix}`,
    expectedDocumentVersion,
  });

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.organization.createMany({ data: [
      { id: ids.orgA, name: 'Audit Document Generation A' },
      { id: ids.orgB, name: 'Audit Document Generation B' },
    ] });
    await prisma.user.createMany({ data: [
      { id: ids.operatorA, email: `${ids.operatorA}@example.invalid`, password: 'unused', firstName: 'Alice', lastName: 'Audit', role: 'OPERATOR', organizationId: ids.orgA },
      { id: ids.operatorC, email: `${ids.operatorC}@example.invalid`, password: 'unused', firstName: 'Charlie', lastName: 'Audit', role: 'OPERATOR', organizationId: ids.orgA },
      { id: ids.operatorB, email: `${ids.operatorB}@example.invalid`, password: 'unused', firstName: 'Bob', lastName: 'Audit', role: 'OPERATOR', organizationId: ids.orgB },
    ] });
    await prisma.client.createMany({ data: [
      { id: ids.clientA, name: 'Synthetic Client A', regulatoryRequirements: [], organizationId: ids.orgA },
      { id: ids.clientB, name: 'Synthetic Client B', regulatoryRequirements: [], organizationId: ids.orgB },
    ] });
    await prisma.building.createMany({ data: [
      { id: ids.buildingA, name: 'Synthetic Building A', address: '1 QA Street', city: 'Montreal', province: 'QC', clientId: ids.clientA, organizationId: ids.orgA },
      { id: ids.buildingB, name: 'Synthetic Building B', address: '2 QA Street', city: 'Quebec', province: 'QC', clientId: ids.clientB, organizationId: ids.orgB },
    ] });
    const common = { year: 2026, clientId: ids.clientA, buildingId: ids.buildingA, userId: ids.operatorA, organizationId: ids.orgA };
    await prisma.project.createMany({ data: [
      { id: ids.pmu, name: 'Synthetic PMU', documentType: 'PMU', configData: { province: 'QC', sourceMarker: 'persisted-pmu' }, ...common },
      { id: ids.psi, name: 'Synthetic PSI', documentType: 'PSI', configData: { province: 'QC', sourceMarker: 'persisted-psi' }, ...common },
      { id: ids.pca, name: 'Synthetic PCA', documentType: 'PCA', configData: { sourceMarker: 'ignored-for-pca' }, ...common },
      { id: ids.archived, name: 'Archived PMU', documentType: 'PMU', status: 'ARCHIVED', configData: { province: 'QC' }, ...common },
      { id: ids.inactive, name: 'Inactive PMU', documentType: 'PMU', isActive: false, configData: { province: 'QC' }, ...common },
      { id: ids.failure, name: 'Failure PMU', documentType: 'PMU', configData: { province: 'QC' }, ...common },
      { id: ids.concurrent, name: 'Concurrent PMU', documentType: 'PMU', configData: { province: 'QC' }, ...common },
      { id: ids.retry, name: 'Retry PMU', documentType: 'PMU', configData: { province: 'QC' }, ...common },
      { id: ids.incompatible, name: 'Incompatible PMU', documentType: 'PMU', configData: { province: 'QC', revision: 1 }, ...common },
    ] });
    await prisma.pcaConfig.create({ data: { projectId: ids.pca, regulatoryReqs: [], authoritiesToNotify: [], planName: 'Synthetic PCA' } });
  });

  afterAll(async () => {
    const projectIds = [ids.pmu, ids.psi, ids.pca, ids.archived, ids.inactive, ids.failure, ids.concurrent, ids.retry, ids.incompatible];
    await prisma.documentGenerationRequest.deleteMany({ where: { projectId: { in: projectIds } } });
    await prisma.document.deleteMany({ where: { projectId: { in: projectIds } } });
    await prisma.pcaConfig.deleteMany({ where: { projectId: ids.pca } });
    await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
    await prisma.building.deleteMany({ where: { id: { in: [ids.buildingA, ids.buildingB] } } });
    await prisma.client.deleteMany({ where: { id: { in: [ids.clientA, ids.clientB] } } });
    await prisma.user.deleteMany({ where: { id: { in: [ids.operatorA, ids.operatorB, ids.operatorC] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [ids.orgA, ids.orgB] } } });
    await prisma.$disconnect();
  });

  it.each([
    ['PMU', ids.pmu, 'persisted-pmu'],
    ['PSI', ids.psi, 'persisted-psi'],
    ['PCA', ids.pca, undefined],
  ])('genere le type %s pour son operateur assigne', async (type, projectId, marker) => {
    const result = await service.generateAndSave(projectId, { sourceMarker: 'stale-browser-body' }, actorA, command(type));
    expect(result).toMatchObject({ version: 1, replayed: false });
    const document = await prisma.document.findFirstOrThrow({ where: { projectId } });
    expect(document.status).toBe('IN_PROGRESS');
    if (marker) expect((document.content as any).config.sourceMarker).toBe(marker);
    expect(await prisma.project.findUniqueOrThrow({ where: { id: projectId } })).toMatchObject({ progress: 50, status: 'IN_PROGRESS' });
  });

  it('refuse les acteurs hors perimetre sans effet secondaire', async () => {
    const before = await prisma.document.count({ where: { projectId: ids.pmu } });
    await expect(service.generateAndSave(ids.pmu, {}, actorC, command('denied-c', 1))).rejects.toThrow();
    await expect(service.generateAndSave(ids.pmu, {}, actorB, command('denied-b', 1))).rejects.toThrow();
    await expect(validation.validate(ids.pmu, actorC)).rejects.toThrow('Projet introuvable');
    expect(await prisma.document.count({ where: { projectId: ids.pmu } })).toBe(before);
    expect(await prisma.documentGenerationRequest.count({ where: { projectId: ids.pmu } })).toBe(1);
  });

  it('refuse archive et projet desactive avant toute ecriture', async () => {
    await expect(service.generateAndSave(ids.archived, {}, actorA, command('archived'))).rejects.toThrow();
    await expect(service.generateAndSave(ids.inactive, {}, actorA, command('inactive'))).rejects.toThrow();
    expect(await prisma.document.count({ where: { projectId: { in: [ids.archived, ids.inactive] } } })).toBe(0);
    expect(await prisma.documentGenerationRequest.count({ where: { projectId: { in: [ids.archived, ids.inactive] } } })).toBe(0);
  });

  it('rollback toutes les ecritures PostgreSQL si la transition projet echoue', async () => {
    await prisma.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION docgen_fail_project_update() RETURNS trigger AS $$ BEGIN IF NEW.id = '${ids.failure}' AND NEW.progress = 50 THEN RAISE EXCEPTION 'synthetic project update failure'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql;`);
    await prisma.$executeRawUnsafe('CREATE TRIGGER docgen_fail_project_update_trigger BEFORE UPDATE ON "Project" FOR EACH ROW EXECUTE FUNCTION docgen_fail_project_update()');
    try {
      await expect(service.generateAndSave(ids.failure, {}, actorA, command('failure'))).rejects.toThrow();
    } finally {
      await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS docgen_fail_project_update_trigger ON "Project"');
      await prisma.$executeRawUnsafe('DROP FUNCTION IF EXISTS docgen_fail_project_update()');
    }
    expect(await prisma.document.count({ where: { projectId: ids.failure } })).toBe(0);
    expect(await prisma.documentGenerationRequest.count({ where: { projectId: ids.failure } })).toBe(0);
    expect(await prisma.project.findUniqueOrThrow({ where: { id: ids.failure } })).toMatchObject({ progress: 0, status: 'DRAFT' });
  });

  it('rejoue la meme demande et bloque deux intentions concurrentes sur la meme version', async () => {
    const retryCommand = command('response-lost');
    const first = await service.generateAndSave(ids.retry, {}, actorA, retryCommand);
    const replay = await service.generateAndSave(ids.retry, {}, actorA, retryCommand);
    expect(first).toMatchObject({ version: 1, replayed: false });
    expect(replay).toMatchObject({ documentId: first.documentId, version: 1, replayed: true });

    const settled = await Promise.allSettled([
      service.generateAndSave(ids.concurrent, {}, actorA, command('concurrent-a')),
      service.generateAndSave(ids.concurrent, {}, actorA, command('concurrent-b')),
    ]);
    expect(settled.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
    expect(settled.filter((item) => item.status === 'rejected')).toHaveLength(1);
    expect(await prisma.document.count({ where: { projectId: ids.concurrent } })).toBe(1);
    expect((await prisma.document.findFirstOrThrow({ where: { projectId: ids.concurrent } })).version).toBe(1);
  });

  it('refuse la reutilisation incompatible dune cle didempotence', async () => {
    const key = command('incompatible');
    await service.generateAndSave(ids.incompatible, {}, actorA, key);
    await prisma.project.update({ where: { id: ids.incompatible }, data: { configData: { province: 'QC', revision: 2 } } });
    await expect(service.generateAndSave(ids.incompatible, {}, actorA, key)).rejects.toThrow('demande incompatible');
    expect(await prisma.document.count({ where: { projectId: ids.incompatible } })).toBe(1);
    expect((await prisma.document.findFirstOrThrow({ where: { projectId: ids.incompatible } })).version).toBe(1);
  });
});
