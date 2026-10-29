import { ConflictException, ForbiddenException } from '@nestjs/common';
import {
  createReviewSnapshot,
  hashReviewSnapshot,
} from '../approval/document-review-integrity';

jest.mock('./export.service', () => ({
  ExportService: class ExportService {},
}));

const { DocumentPdfExportService } = require('./document-pdf-export.service');

describe('DocumentPdfExportService', () => {
  const actor = { userId: 'user-a', organizationId: 'org-a', role: 'ADMIN' };
  const input = {
    idempotencyKey: 'export-request-0001',
    language: 'fr' as const,
    selectedModules: [1, 2],
    moduleOrder: [1, 2],
    isPreview: false,
  };

  function harness() {
    const snapshot = createReviewSnapshot({
      project: {
        id: 'project-a',
        name: 'Projet synthétique',
        documentType: 'PMU',
        year: 2026,
        configData: {},
        client: { id: 'client-a', name: 'Client synthétique' },
        building: { id: 'building-a', name: 'Bâtiment synthétique' },
        adviser: { id: 'user-a', firstName: 'A', lastName: 'Auteur' },
        plans: [],
      },
      document: {
        id: 'document-a',
        title: 'PMU synthétique',
        status: 'APPROVED',
        version: 4,
        lockVersion: 7,
        content: { sections: [{ title: 'Source approuvée' }] },
      },
    });
    const sourceHash = hashReviewSnapshot(snapshot);
    const review = {
      id: 'review-a',
      projectId: 'project-a',
      organizationId: 'org-a',
      documentId: 'document-a',
      status: 'APPROVED',
      decisionVersion: 4,
      decidedAt: new Date(),
      snapshot,
      contentHash: sourceHash,
    };
    const version = {
      id: 'version-a',
      projectId: 'project-a',
      versionNumber: 4,
      snapshot: { reviewRequestId: review.id, contentHash: sourceHash },
    };
    const project = {
      id: 'project-a',
      organizationId: 'org-a',
      isActive: true,
      status: 'VALIDATED',
      documentType: 'PMU',
      year: 2026,
      name: 'Projet synthétique',
      building: { name: 'Bâtiment synthétique' },
    };
    let row: any;
    const prisma: any = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      $transaction: jest.fn(async (callback: (tx: any) => unknown) =>
        callback(prisma),
      ),
      project: { findFirst: jest.fn().mockResolvedValue(project) },
      documentReviewRequest: { findFirst: jest.fn().mockResolvedValue(review) },
      projectVersion: { findUnique: jest.fn().mockResolvedValue(version) },
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: actor.userId,
            organizationId: actor.organizationId,
            role: actor.role,
            isActive: true,
          }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      documentPdfExport: {
        findUnique: jest.fn(async () => row ?? null),
        findUniqueOrThrow: jest.fn(async () => ({
          ...row,
          reviewRequest: review,
          projectVersion: version,
        })),
        findFirst: jest.fn(async () => row ?? null),
        create: jest.fn(async ({ data }: any) => {
          row = {
            id: 'pdf-export-a',
            status: 'PROCESSING',
            artifacts: [],
            generatedAt: null,
            failedAt: null,
            failureCode: null,
            generationStartedAt: new Date(),
            ...data,
          };
          return row;
        }),
        update: jest.fn(async ({ data }: any) => (row = { ...row, ...data })),
        updateMany: jest.fn(async ({ data }: any) => {
          row = { ...row, ...data };
          return { count: 1 };
        }),
      },
    };
    const renderer: any = {
      generateApprovedSnapshotPdf: jest
        .fn()
        .mockResolvedValue({ fr: Buffer.from('%PDF-approved') }),
    };
    const storageObjects = new Map<string, Buffer>();
    const storage: any = {
      uploadPrivateImmutable: jest.fn(async (bytes: Buffer, key: string) => {
        if (storageObjects.has(key))
          throw new Error('PRIVATE_OBJECT_ALREADY_EXISTS');
        storageObjects.set(key, Buffer.from(bytes));
      }),
      downloadPrivate: jest.fn(async (key: string) =>
        Buffer.from(storageObjects.get(key) ?? ''),
      ),
    };
    return {
      service: new DocumentPdfExportService(prisma, renderer, storage),
      prisma,
      renderer,
      storage,
      review,
      snapshot,
      getRow: () => row,
    };
  }

  it('publie une seule fois le rendu de la version approuvée pour une même clé', async () => {
    const test = harness();

    const first = await test.service.request('project-a', input, actor);
    const second = await test.service.request('project-a', input, actor);

    expect(first.status).toBe('AVAILABLE');
    expect(second.id).toBe(first.id);
    expect(test.renderer.generateApprovedSnapshotPdf).toHaveBeenCalledTimes(1);
    expect(test.renderer.generateApprovedSnapshotPdf).toHaveBeenCalledWith(
      test.snapshot,
      expect.objectContaining({ language: 'fr' }),
    );
    expect(test.storage.uploadPrivateImmutable).toHaveBeenCalledTimes(1);
    expect(test.prisma.auditLog.create).toHaveBeenCalledTimes(1);
    expect(first.artifacts[0]).not.toHaveProperty('storageKey');
  });

  it('refuse un projet qui n’est pas exportable sans créer de résultat', async () => {
    const test = harness();
    test.prisma.project.findFirst.mockResolvedValue(null);

    await expect(
      test.service.request('project-a', input, actor),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(test.prisma.documentPdfExport.create).not.toHaveBeenCalled();
    expect(test.renderer.generateApprovedSnapshotPdf).not.toHaveBeenCalled();
  });

  it('refuse un snapshot approuvé dont l’intégrité ne correspond plus', async () => {
    const test = harness();
    test.review.snapshot = { ...test.review.snapshot, altered: true };

    await expect(
      test.service.request('project-a', input, actor),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(test.prisma.documentPdfExport.create).not.toHaveBeenCalled();
  });

  it('persiste un échec puis reprend sans créer un second export', async () => {
    const test = harness();
    test.renderer.generateApprovedSnapshotPdf
      .mockRejectedValueOnce(new Error('RENDERER_UNAVAILABLE'))
      .mockResolvedValueOnce({ fr: Buffer.from('%PDF-recovered') });

    const failed = await test.service.request('project-a', input, actor);
    expect(failed.status).toBe('FAILED');
    expect(failed.failureCode).toBe('RENDERER_UNAVAILABLE');

    const recovered = await test.service.retry('project-a', failed.id, actor);
    expect(recovered.status).toBe('AVAILABLE');
    expect(recovered.id).toBe(failed.id);
    expect(test.prisma.documentPdfExport.create).toHaveBeenCalledTimes(1);
    expect(test.renderer.generateApprovedSnapshotPdf).toHaveBeenCalledTimes(2);
  });

  it('vérifie le hash avant de transmettre un PDF privé', async () => {
    const test = harness();
    const available = await test.service.request('project-a', input, actor);

    test.storage.downloadPrivate.mockResolvedValueOnce(
      Buffer.from('%PDF-corrompu'),
    );
    await expect(
      test.service.download('project-a', available.id, 'fr', actor),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('reprend apres une panne de stockage sans faux succes', async () => {
    const test = harness();
    test.storage.uploadPrivateImmutable
      .mockRejectedValueOnce(new Error('PRIVATE_STORAGE_UNAVAILABLE'))
      .mockImplementationOnce(async (bytes: Buffer) => {
        test.storage.downloadPrivate.mockResolvedValue(Buffer.from(bytes));
      });

    const failed = await test.service.request('project-a', input, actor);
    expect(failed.status).toBe('FAILED');
    expect(failed.failureCode).toBe('PRIVATE_STORAGE_UNAVAILABLE');
    expect(failed.artifacts).toEqual([]);

    const recovered = await test.service.retry('project-a', failed.id, actor);
    expect(recovered.status).toBe('AVAILABLE');
    expect(recovered.id).toBe(failed.id);
    expect(test.prisma.documentPdfExport.create).toHaveBeenCalledTimes(1);
  });

  it('reutilise objet prive verifie apres echec de publication', async () => {
    const test = harness();
    test.prisma.auditLog.create
      .mockRejectedValueOnce(new Error('PUBLICATION_DATABASE_UNAVAILABLE'))
      .mockResolvedValueOnce({});

    const failed = await test.service.request('project-a', input, actor);
    expect(failed.status).toBe('FAILED');
    expect(failed.failureCode).toBe('PUBLICATION_DATABASE_UNAVAILABLE');
    expect(test.getRow().artifacts).toHaveLength(1);

    const recovered = await test.service.retry('project-a', failed.id, actor);
    expect(recovered.status).toBe('AVAILABLE');
    expect(test.renderer.generateApprovedSnapshotPdf).toHaveBeenCalledTimes(1);
    expect(test.storage.uploadPrivateImmutable).toHaveBeenCalledTimes(1);
    expect(test.storage.downloadPrivate).toHaveBeenCalledTimes(1);
  });

  it('reprend un traitement interrompu seulement apres expiration du bail', async () => {
    const test = harness();
    test.renderer.generateApprovedSnapshotPdf.mockRejectedValueOnce(
      new Error('PROCESS_INTERRUPTED'),
    );
    const failed = await test.service.request('project-a', input, actor);
    const row = test.getRow();
    row.status = 'PROCESSING';
    row.generationLeaseUntil = new Date(0);

    const recovered = await test.service.retry('project-a', failed.id, actor);
    expect(recovered.status).toBe('AVAILABLE');
    expect(test.prisma.documentPdfExport.create).toHaveBeenCalledTimes(1);
    expect(test.renderer.generateApprovedSnapshotPdf).toHaveBeenCalledTimes(2);
  });

  it('refuse publication si etat exportable change pendant traitement', async () => {
    const test = harness();
    const authorized = await test.prisma.project.findFirst();
    test.prisma.project.findFirst
      .mockResolvedValueOnce(authorized)
      .mockResolvedValueOnce(authorized)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(authorized);

    const failed = await test.service.request('project-a', input, actor);
    expect(failed.status).toBe('FAILED');
    expect(failed.failureCode).toBe('PROJECT_NOT_EXPORTABLE');
    expect(test.prisma.auditLog.create).not.toHaveBeenCalled();
  });
});
