import { BadRequestException, ConflictException } from '@nestjs/common';
import { CorrectiveActionEvidenceService } from './corrective-action-evidence.service';

const actor = { sub: 'user-a', organizationId: 'org-a', role: 'CLIENT_MANAGER', clientId: 'client-a', buildingIds: ['building-a'] };
const intent = '11111111-1111-4111-8111-111111111111';

function harness() {
  const rows: any[] = [];
  const evidence = {
    findMany: jest.fn(async () => rows), findFirst: jest.fn(async ({ where }: any) => rows.find((x) => x.organizationId === where.organizationId && x.clientIntentId === where.clientIntentId) || null),
    findFirstOrThrow: jest.fn(async ({ where }: any) => rows.find((x) => x.clientIntentId === where.clientIntentId)!),
    findUniqueOrThrow: jest.fn(async ({ where }: any) => rows.find((x) => x.id === where.id)!),
    create: jest.fn(async ({ data }: any) => { const row = { id: data.id || `ev-${rows.length + 1}`, submittedAt: new Date(), createdAt: new Date(), ...data }; rows.push(row); return row; }),
    updateMany: jest.fn(async ({ where, data }: any) => { const row = rows.find((x) => x.id === where.id && (!where.status || x.status === where.status)); if (!row) return { count: 0 }; Object.assign(row, data); return { count: 1 }; }),
  };
  const prisma: any = { correctiveActionEvidence: evidence, correctiveActionAuditEvent: { create: jest.fn() }, populationEvidenceRecord: { findFirst: jest.fn() }, exerciseReport: { findFirst: jest.fn() }, incidentEvent: { findFirst: jest.fn() }, $executeRaw: jest.fn(), $transaction: jest.fn((cb: any) => cb(prisma)) };
  const storage: any = { downloadPrivate: jest.fn(), uploadPrivateImmutable: jest.fn() };
  const actions: any = { requirePermission: jest.fn(), findAccessibleAction: jest.fn().mockResolvedValue({ id: 'action-a' }) };
  return { rows, prisma, storage, actions, service: new CorrectiveActionEvidenceService(prisma, storage, actions) };
}

describe('CorrectiveActionEvidenceService', () => {
  it('cree une NOTE idempotente sans cle de stockage exposee', async () => {
    const h = harness();
    const body = { clientIntentId: intent, title: 'Formation', noteText: 'Formation realisee' };
    const first = await h.service.addNote('action-a', body, actor);
    const second = await h.service.addNote('action-a', body, actor);
    expect(second.id).toBe(first.id);
    expect(first).toMatchObject({ type: 'NOTE', status: 'ACTIVE', noteText: 'Formation realisee' });
    expect(first).not.toHaveProperty('storageKey');
    expect(h.rows).toHaveLength(1);
  });

  it('refuse un LINK non HTTPS', async () => {
    const h = harness();
    await expect(h.service.addLink('action-a', { clientIntentId: intent, title: 'Lien', externalUrl: 'http://example.com' }, actor)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reserve, stocke, verifie et active un PDF prive', async () => {
    const h = harness();
    const bytes = Buffer.from('%PDF-evidence');
    h.storage.downloadPrivate.mockRejectedValueOnce(new Error('PRIVATE_OBJECT_NOT_FOUND')).mockResolvedValue(bytes);
    const result = await h.service.addFile('action-a', { clientIntentId: intent, title: 'Rapport', type: 'DOCUMENT' as any }, { buffer: bytes, size: bytes.length, mimetype: 'application/pdf', originalname: 'rapport.pdf' } as any, actor);
    expect(h.storage.uploadPrivateImmutable).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ status: 'ACTIVE', fileSize: bytes.length, sha256: expect.stringMatching(/^[a-f0-9]{64}$/) });
    expect(result).not.toHaveProperty('storageKey');
  });

  it('reprend un PENDING dont l objet existe sans second upload', async () => {
    const h = harness();
    const bytes = Buffer.from('%PDF-evidence');
    h.storage.downloadPrivate.mockResolvedValue(bytes);
    await h.service.addFile('action-a', { clientIntentId: intent, title: 'Rapport', type: 'DOCUMENT' as any }, { buffer: bytes, size: bytes.length, mimetype: 'application/pdf', originalname: 'rapport.pdf' } as any, actor);
    expect(h.storage.uploadPrivateImmutable).not.toHaveBeenCalled();
    expect(h.rows[0].status).toBe('ACTIVE');
  });

  it('refuse la reutilisation d une intention avec des octets differents', async () => {
    const h = harness();
    const first = Buffer.from('%PDF-first');
    h.storage.downloadPrivate.mockRejectedValueOnce(new Error('PRIVATE_OBJECT_NOT_FOUND')).mockResolvedValue(first);
    await h.service.addFile('action-a', { clientIntentId: intent, title: 'Rapport', type: 'DOCUMENT' as any }, { buffer: first, size: first.length, mimetype: 'application/pdf', originalname: 'a.pdf' } as any, actor);
    await expect(h.service.addFile('action-a', { clientIntentId: intent, title: 'Rapport', type: 'DOCUMENT' as any }, { buffer: Buffer.from('%PDF-other'), size: 10, mimetype: 'application/pdf', originalname: 'a.pdf' } as any, actor)).rejects.toBeInstanceOf(ConflictException);
  });

  it('retire logiquement sans supprimer l objet', async () => {
    const h = harness();
    h.rows.push({ id: 'ev-1', organizationId: 'org-a', correctiveActionId: 'action-a', status: 'ACTIVE', storageKey: 'private/key' });
    const result = await h.service.withdraw('action-a', 'ev-1', { withdrawalReason: 'Document remplace' }, actor);
    expect(result.status).toBe('WITHDRAWN');
    expect(h.storage).not.toHaveProperty('deletePrivate');
  });
});
