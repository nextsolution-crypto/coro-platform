import { BuildingDocumentsService } from '../src/building-documents/building-documents.service';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ProjectFilesService } from '../src/project-files/project-files.service';
import { KnowledgeConfig } from '../src/knowledge/knowledge.config';
import { KnowledgeAuthorizationService } from '../src/knowledge/knowledge-authorization.service';
import { KnowledgeIngestionService } from '../src/knowledge/knowledge-ingestion.service';
import { KnowledgeRetrievalService } from '../src/knowledge/knowledge-retrieval.service';
import { KnowledgeExtractorService } from '../src/knowledge/knowledge-extractor.service';
import { KnowledgeNormalizer } from '../src/knowledge/knowledge-normalizer';
import { KnowledgeChunkerService } from '../src/knowledge/knowledge-chunker.service';
import { DeterministicEmbeddingService } from '../src/knowledge/deterministic-embedding.service';
import { KnowledgeActor } from '../src/knowledge/knowledge.types';

const url = process.env.TEST_DATABASE_URL;
if (process.env.CI && !url) throw new Error('TEST_DATABASE_URL_REQUIRED');
if (url) {
  const parsed = new URL(url);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname) || !/test/i.test(parsed.pathname))
    throw new Error('KNOWLEDGE_TEST_DATABASE_MUST_BE_LOCAL_AND_EXPLICITLY_TEST');
}
const describePg = url ? describe : describe.skip;

describePg('Knowledge master canonical lifecycle and tenant isolation PostgreSQL', () => {
  const prisma = new PrismaClient(url ? { datasources: { db: { url } } } : undefined);
  const suffix = randomUUID();
  const org = `knowledge-org-${suffix}`, otherOrg = `knowledge-other-${suffix}`;
  const owner = `knowledge-owner-${suffix}`, outsider = `knowledge-outsider-${suffix}`;
  const client = `knowledge-client-${suffix}`, building = `knowledge-building-${suffix}`, project = `knowledge-project-${suffix}`;
  const manager = `knowledge-manager-${suffix}`, otherManager = `knowledge-other-manager-${suffix}`;
  const tenantBClient = `knowledge-client-b-${suffix}`, tenantBManager = `knowledge-manager-b-${suffix}`;
  const internal: KnowledgeActor = { type: 'INTERNAL_USER', id: owner, organizationId: org, role: 'OPERATOR' };
  const portal: KnowledgeActor = { type: 'CLIENT_USER', id: manager, organizationId: org, role: 'CLIENT_MANAGER', buildingIds: [building] };
  const config = new KnowledgeConfig();
  const objects = new Map<string, Buffer>();
  const unavailableOnce = new Set<string>();
  const files = new ProjectFilesService(prisma as any, {
    uploadPrivateImmutable: async (buffer: Buffer, key: string) => {
      if (objects.has(key)) throw new Error('IMMUTABLE_OBJECT_EXISTS');
      objects.set(key, Buffer.from(buffer)); return { storageKey: key };
    },
    downloadPrivate: async (key: string) => {
      if (unavailableOnce.delete(key)) throw new Error('STORAGE_UNAVAILABLE');
      const buffer = objects.get(key); if (!buffer) throw new Error('OBJECT_NOT_FOUND'); return Buffer.from(buffer);
    },
  } as any, { create: jest.fn() } as any);
  const authorization = new KnowledgeAuthorizationService(prisma as any);
  const embeddings = new DeterministicEmbeddingService();
  const extractor = new KnowledgeExtractorService(config);
  const ingestion = new KnowledgeIngestionService(prisma as any, files, authorization, extractor,
    new KnowledgeChunkerService(config, new KnowledgeNormalizer()), embeddings, config);
  const retrieval = new KnowledgeRetrievalService(prisma as any, authorization, embeddings, config);
  const fixture = (name = 'master-native-v1.pdf') => readFileSync(join(__dirname, '../assets/knowledge-qa', name));
  const transition = (file: any) => ({ fileId: file.id, organizationId: org, actorId: owner,
    reason: 'Validation synthétique automatisée du chantier Knowledge', requestId: randomUUID(), lockVersion: file.lockVersion });
  const upload = async (visibility = 'shared', parentId?: string, name?: string) => {
    const buffer = fixture(name);
    return files.uploadFile({ projectId: project, organizationId: org, name: name ?? 'master-native-v1.pdf',
      category: 'documents_reference', mimeType: 'application/pdf', size: buffer.length, buffer, visibility, uploadedById: owner, parentId });
  };
  const approve = async (file: any, effectiveAt = new Date(Date.now() - 1000).toISOString(), expiresAt?: string) => {
    const reviewed = await files.requestReview(transition(file));
    return files.approveFile({ ...transition(reviewed), effectiveAt, expiresAt });
  };
  beforeAll(async () => {
    await prisma.$connect();
    await prisma.organization.createMany({ data: [{ id: org, name: 'Knowledge synthetic A' }, { id: otherOrg, name: 'Knowledge synthetic B' }] });
    await prisma.user.createMany({ data: [owner, outsider].map(id => ({ id, email: `${id}@example.invalid`, password: 'unused', firstName: 'Synthetic', lastName: 'Advisor', organizationId: org, role: 'OPERATOR' as const })) });
    await prisma.client.create({ data: { id: client, name: 'Knowledge synthetic client', regulatoryRequirements: [], organizationId: org } });
    await prisma.client.create({ data: { id: tenantBClient, name: 'Knowledge synthetic other tenant client', regulatoryRequirements: [], organizationId: otherOrg } });
    await prisma.clientUser.create({ data: { id: tenantBManager, email: `${tenantBManager}@example.invalid`, password: 'unused', firstName: 'Synthetic', lastName: 'Tenant B', organizationId: otherOrg, clientId: tenantBClient, role: 'CLIENT_CORPORATE' } });
    await prisma.building.create({ data: { id: building, name: 'Knowledge synthetic building', address: 'Fictif', city: 'Fictif', province: 'QC', clientId: client, organizationId: org } });
    await prisma.project.create({ data: { id: project, name: 'Knowledge synthetic project', documentType: 'PCA', year: 2026, organizationId: org, clientId: client, buildingId: building, userId: owner } });
    await prisma.clientUser.createMany({ data: [{ id: manager, buildingIds: [building] }, { id: otherManager, buildingIds: [] }].map(value => ({ ...value, email: `${value.id}@example.invalid`, password: 'unused', firstName: 'Synthetic', lastName: 'Client', organizationId: org, clientId: client, role: 'CLIENT_MANAGER' as const })) });
  });
  afterAll(async () => prisma.$disconnect());

  it('indexes only approved canonical bytes, keeps page/section/SHA provenance and is idempotent', async () => {
    const draft = await upload();
    await expect(ingestion.index(internal, draft.id)).rejects.toThrow('non admissible');
    const review = await files.requestReview(transition(draft));
    await expect(ingestion.index(internal, draft.id)).rejects.toThrow('non admissible');
    const approved = await files.approveFile({ ...transition(review), effectiveAt: new Date(Date.now() - 1000).toISOString() });
    const indexed = await ingestion.index(internal, approved.id);
    expect(indexed?.status).toBe('READY');
    expect((await ingestion.index(internal, approved.id))?.id).toBe(indexed?.id);
    const hits = await retrieval.search(portal, 'Orme CODE-ORME-031', building);
    const hit = hits.find(value => value.projectFileId === approved.id && value.pageStart === 2);
    expect(hit).toMatchObject({ projectFileVersion: 1, sourceSha256: approved.sha256, sectionPath: '2' });
    expect((await retrieval.search({ ...internal, id: outsider }, 'Orme', building)).some(hit => hit.projectFileId === approved.id)).toBe(true);
    expect(await retrieval.search({ ...portal, id: otherManager }, 'Orme', building)).toEqual([]);
    expect(await retrieval.search({ type: 'CLIENT_USER', id: tenantBManager, organizationId: otherOrg, role: 'CLIENT_CORPORATE', buildingIds: [] }, 'Orme')).toEqual([]);
    await expect(retrieval.search({ ...internal, organizationId: otherOrg }, 'Orme')).rejects.toThrow('inactive');
    const revoked = await files.revokeFile(transition(approved));
    expect(revoked.lifecycleState).toBe('REVOKED');
    expect((await retrieval.search(portal, 'Orme', building)).some(value => value.projectFileId === approved.id)).toBe(false);
    await ingestion.reconcile(approved.id);
    expect((await prisma.projectFileKnowledgeIngestion.findUnique({ where: { id: indexed!.id } }))?.status).toBe('REVOKED');
  });

  it('excludes internal, future and expired sources from client retrieval', async () => {
    const internalFile = await approve(await upload('internal'));
    await ingestion.index(internal, internalFile.id);
    expect((await retrieval.search(portal, 'Orme', building)).some(value => value.projectFileId === internalFile.id)).toBe(false);
    const future = await approve(await upload(), new Date(Date.now() + 3600000).toISOString());
    const expired = await approve(await upload(), new Date(Date.now() - 7200000).toISOString(), new Date(Date.now() - 3600000).toISOString());
    for (const file of [future, expired]) await expect(ingestion.index(internal, file.id)).rejects.toThrow('non admissible');
  });

  it('supersedes the previous version through canonical approval and immediately filters it', async () => {
    const v1 = await approve(await upload());
    await ingestion.index(internal, v1.id);
    const v2 = await approve(await upload('shared', v1.id, 'master-native-v2.pdf'));
    await ingestion.index(internal, v2.id);
    const hits = await retrieval.search(portal, 'Orme CODE-ORME', building);
    expect(hits.some(value => value.projectFileId === v1.id)).toBe(false);
    expect(hits.some(value => value.projectFileId === v2.id && value.projectFileVersion === 2)).toBe(true);
  });

  it('refuses publication if a source is revoked while extraction is in progress', async () => {
    const file = await approve(await upload());
    const revokeDuringExtract = { extract: async (bytes: Buffer, mime: string) => {
      const pages = await extractor.extract(bytes, mime);
      await files.revokeFile(transition(file)); return pages;
    } };
    const racing = new KnowledgeIngestionService(prisma as any, files, authorization, revokeDuringExtract as any,
      new KnowledgeChunkerService(config, new KnowledgeNormalizer()), embeddings, config);
    await expect(racing.index(internal, file.id)).rejects.toThrow('SOURCE_NO_LONGER_ADMISSIBLE');
    const record = await prisma.projectFileKnowledgeIngestion.findFirst({ where: { projectFileId: file.id } });
    expect(record).toMatchObject({ status: 'FAILED', lastErrorCode: 'SOURCE_NO_LONGER_ADMISSIBLE' });
    expect(await prisma.projectFileKnowledgeChunk.count({ where: { ingestionId: record!.id } })).toBe(0);
  });
  it('recovers an interrupted storage read through the same idempotent canonical ingestion', async () => {
    const file = await approve(await upload());
    const canonical = await prisma.projectFile.findUniqueOrThrow({ where: { id: file.id } });
    unavailableOnce.add(canonical.storageKey!);
    await expect(ingestion.index(internal, file.id)).rejects.toThrow('STORAGE_UNAVAILABLE');
    const failed = await prisma.projectFileKnowledgeIngestion.findFirstOrThrow({ where: { projectFileId: file.id } });
    expect(failed).toMatchObject({ status: 'FAILED', attemptCount: 1, lastErrorCode: 'STORAGE_UNAVAILABLE' });
    expect(await prisma.projectFileKnowledgeChunk.count({ where: { ingestionId: failed.id } })).toBe(0);
    const recovered = await ingestion.index(internal, file.id);
    expect(recovered).toMatchObject({ id: failed.id, status: 'READY', attemptCount: 2, lastErrorCode: null });
    expect(recovered?.chunks).toHaveLength(3);
    expect((await ingestion.index(internal, file.id))?.id).toBe(failed.id);
    expect(await prisma.projectFileKnowledgeIngestion.count({ where: { projectFileId: file.id } })).toBe(1);
  });

  it('keeps approved project sources after archival and accepts direct building sources with the same citation authority', async () => {
    const documentSpace = new BuildingDocumentsService(prisma as any, files);
    const projectSource = await approve(await upload());
    await ingestion.index(internal, projectSource.id);
    await prisma.project.update({ where: { id: project }, data: { status: 'ARCHIVED' } });
    try {
      const listing = await documentSpace.list(portal, building);
      expect(listing.files.some(file => file.id === projectSource.id)).toBe(true);
      expect((await retrieval.search(portal, 'Orme', building)).some(hit => hit.projectFileId === projectSource.id)).toBe(true);
      const buffer = fixture();
      const direct = await files.uploadFile({ buildingId: building, organizationId: org, name: 'reference-batiment.pdf', category: 'documents_reference', mimeType: 'application/pdf', size: buffer.length, buffer, visibility: 'shared', uploadedById: owner });
      expect((await prisma.projectFile.findUnique({ where: { id: direct.id } }))?.projectId).toBeNull();
      expect((await retrieval.search(portal, 'Orme', building)).some(hit => hit.projectFileId === direct.id)).toBe(false);
      const approved = await approve(direct);
      await ingestion.index(internal, approved.id);
      const hit = (await retrieval.search(portal, 'Orme', building)).find(hit => hit.projectFileId === direct.id);
      expect(hit).toMatchObject({ buildingId: building, sourceSha256: approved.sha256, projectFileVersion: 1 });
      expect((await documentSpace.content(portal, building, direct.id)).buffer.equals(buffer)).toBe(true);
      // The next version may be prepared directly at the building, even for a project-produced root.
      const successor = await files.uploadFile({ buildingId: building, organizationId: org, parentId: projectSource.id, name: 'reference-mise-a-jour.pdf', category: 'documents_reference', mimeType: 'application/pdf', size: buffer.length, buffer, visibility: 'shared', uploadedById: owner });
      expect(successor.version).toBe(2);
      const replaced = await approve(successor);
      await ingestion.index(internal, replaced.id);
      expect((await retrieval.search(portal, 'Orme', building)).some(hit => hit.projectFileId === projectSource.id)).toBe(false);
      expect((await retrieval.search(portal, 'Orme', building)).some(hit => hit.projectFileId === successor.id)).toBe(true);
    } finally {
      await prisma.project.update({ where: { id: project }, data: { status: 'DRAFT' } });
    }
  });

  it('allows organization-wide corporate reads without implicit mutation rights and honours live documentary grants', async () => {
    const documentSpace = new BuildingDocumentsService(prisma as any, files);
    const corporate = `same-org-corporate-${suffix}`;
    const separateClient = `same-org-client-${suffix}`;
    await prisma.client.create({ data: { id: separateClient, organizationId: org, name: 'Other synthetic customer', regulatoryRequirements: [] } });
    await prisma.clientUser.create({ data: { id: corporate, email: `${corporate}@example.invalid`, password: 'unused', firstName: 'Synthetic', lastName: 'Corporate', organizationId: org, clientId: separateClient, role: 'CLIENT_CORPORATE' } });
    const actor: KnowledgeActor = { type: 'CLIENT_USER', id: corporate, organizationId: org, role: 'CLIENT_CORPORATE', buildingIds: [] };
    const corporateListing = await documentSpace.list(actor, building);
    expect(corporateListing.building.id).toBe(building);
    expect(corporateListing.canUpload).toBe(false);
    expect(corporateListing.canManage).toBe(false);
    expect(await retrieval.search(actor, 'Orme', building)).toEqual([]);
    const delegated: KnowledgeActor = { ...portal, id: otherManager, buildingIds: [] };
    await expect(documentSpace.access(delegated, building)).rejects.toThrow('non accordé');
    await documentSpace.setGrant(portal, building, otherManager, true);
    expect((await documentSpace.access(delegated, building)).canUpload).toBe(true);
    await documentSpace.setGrant(portal, building, otherManager, false);
    await expect(documentSpace.access(delegated, building)).rejects.toThrow('non accordé');
    expect(await prisma.auditLog.count({ where: { organizationId: org, entityId: building, action: 'BUILDING_DOCUMENT_PERMISSION_CHANGED' } })).toBeGreaterThanOrEqual(2);
  });

});
