import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProjectFilesService } from './project-files.service';

describe('ProjectFilesService governed lifecycle', () => {
  function harness() {
    const rows: any[] = [
      {
        id: 'file-v1',
        projectId: 'project-a',
        organizationId: 'org-a',
        parentId: null,
        version: 1,
        lifecycleState: 'DRAFT',
        lockVersion: 0,
        url: 'private:project-file',
        storageKey: 'tenant-org-a/file-v1',
        mimeType: 'application/pdf',
        name: 'plan.pdf',
        expiresAt: null,
        project: { userId: 'advisor-a', buildingId: 'building-a' },
      },
    ];
    const events: any[] = [];
    const projectFile = {
      findFirst: jest.fn(async ({ where }: any) => {
        const row = rows.find((candidate) => candidate.id === where.id);
        if (!row || row.organizationId !== where.organizationId) return null;
        if (where.lifecycleState && row.lifecycleState !== where.lifecycleState)
          return null;
        if (
          where.project?.buildingId?.in &&
          !where.project.buildingId.in.includes(row.project.buildingId)
        )
          return null;
        return { ...row };
      }),
      findMany: jest.fn(async ({ where }: any) =>
        rows.filter(
          (row) =>
            row.organizationId === where.organizationId &&
            (!where.lifecycleState ||
              row.lifecycleState === where.lifecycleState) &&
            (!where.OR ||
              where.OR.some(
                (part: any) =>
                  part.id === row.id || part.parentId === row.parentId,
              )),
        ),
      ),
      findUnique: jest.fn(
        async ({ where }: any) =>
          rows.find((row) => row.id === where.id) ?? null,
      ),
      updateMany: jest.fn(async ({ where, data }: any) => {
        const row = rows.find((candidate) => candidate.id === where.id);
        if (
          !row ||
          row.organizationId !== where.organizationId ||
          row.lifecycleState !== where.lifecycleState ||
          row.lockVersion !== where.lockVersion
        )
          return { count: 0 };
        Object.assign(row, data, { lockVersion: row.lockVersion + 1 });
        if (data.lockVersion) row.lockVersion = row.lockVersion;
        return { count: 1 };
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const row = rows.find((candidate) => candidate.id === where.id)!;
        Object.assign(row, data, { lockVersion: row.lockVersion + 1 });
        return row;
      }),
    };
    const projectFileLifecycleEvent = {
      findUnique: jest.fn(
        async ({ where }: any) =>
          events.find(
            (event) =>
              event.projectFileId ===
                where.projectFileId_requestId.projectFileId &&
              event.requestId === where.projectFileId_requestId.requestId,
          ) ?? null,
      ),
      create: jest.fn(async ({ data }: any) => {
        const event = {
          id: `event-${events.length + 1}`,
          createdAt: new Date(),
          ...data,
        };
        events.push(event);
        return event;
      }),
      findMany: jest.fn(async ({ where }: any) =>
        events.filter((event) => event.projectFileId === where.projectFileId),
      ),
    };
    const prisma: any = { projectFile, projectFileLifecycleEvent };
    prisma.$executeRaw = jest.fn(async () => 1);
    prisma.$transaction = jest.fn(async (callback: any) => callback(prisma));
    const storage = {
      downloadPrivate: jest.fn(async () => Buffer.from('private')),
    };
    const service = new ProjectFilesService(
      prisma,
      storage as any,
      { create: jest.fn() } as any,
    );
    return { service, rows, events };
  }

  it('governs review and approval with exact project custodian, dates and audit', async () => {
    const h = harness();
    await h.service.requestReview({
      fileId: 'file-v1',
      organizationId: 'org-a',
      actorId: 'advisor-a',
      reason: 'Prêt pour révision',
      requestId: 'review-1',
      lockVersion: 0,
    });
    expect(h.rows[0]).toMatchObject({
      lifecycleState: 'REVIEW',
      lockVersion: 1,
      reviewRequestedById: 'advisor-a',
    });
    await h.service.approveFile({
      fileId: 'file-v1',
      organizationId: 'org-a',
      actorId: 'advisor-a',
      reason: 'Document vérifié et approuvé',
      requestId: 'approve-1',
      lockVersion: 1,
      effectiveAt: '2026-10-20T00:00:00.000Z',
      expiresAt: '2027-10-20T00:00:00.000Z',
    });
    expect(h.rows[0]).toMatchObject({
      lifecycleState: 'APPROVED',
      status: 'valide',
      lockVersion: 2,
      approvedById: 'advisor-a',
    });
    expect(h.events.map((event) => event.action)).toEqual([
      'REVIEW_REQUESTED',
      'APPROVED',
    ]);
  });

  it('denies role-only or cross-tenant transition attempts', async () => {
    const h = harness();
    await expect(
      h.service.requestReview({
        fileId: 'file-v1',
        organizationId: 'org-a',
        actorId: 'admin-without-assignment',
        reason: 'Tentative non autorisée',
        requestId: 'deny-1',
        lockVersion: 0,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      h.service.downloadPrivateFile('file-v1', 'org-b'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('denies revoked and expired downloads while retaining metadata and audit', async () => {
    const h = harness();
    h.rows[0].lifecycleState = 'APPROVED';
    h.rows[0].expiresAt = new Date(Date.now() - 1000);
    await expect(
      h.service.downloadPrivateFile('file-v1', 'org-a'),
    ).rejects.toBeInstanceOf(NotFoundException);
    h.rows[0].expiresAt = null;
    await h.service.revokeFile({
      fileId: 'file-v1',
      organizationId: 'org-a',
      actorId: 'advisor-a',
      reason: 'Document retiré pour non-conformité',
      requestId: 'revoke-1',
      lockVersion: 0,
    });
    expect(h.rows[0]).toMatchObject({
      lifecycleState: 'REVOKED',
      revocationReason: 'Document retiré pour non-conformité',
    });
    await expect(
      h.service.downloadPrivateFile('file-v1', 'org-a'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(h.events.at(-1).action).toBe('REVOKED');
  });

  it('is idempotent and supersedes only the prior approved version', async () => {
    const h = harness();
    h.rows[0].lifecycleState = 'APPROVED';
    h.rows[0].lockVersion = 2;
    h.rows.push({
      ...h.rows[0],
      id: 'file-v2',
      parentId: 'file-v1',
      version: 2,
      lifecycleState: 'REVIEW',
      lockVersion: 1,
      storageKey: 'tenant-org-a/file-v2',
    });

    const request = {
      fileId: 'file-v2',
      organizationId: 'org-a',
      actorId: 'advisor-a',
      reason: 'Deuxième version vérifiée et approuvée',
      requestId: 'approve-v2',
      lockVersion: 1,
      effectiveAt: '2026-10-20T00:00:00.000Z',
    };
    await h.service.approveFile(request);
    await h.service.approveFile(request);

    expect(h.rows[0]).toMatchObject({ lifecycleState: 'SUPERSEDED' });
    expect(h.rows[1]).toMatchObject({
      lifecycleState: 'APPROVED',
      lockVersion: 2,
    });
    expect(
      h.events.filter((event) => event.action === 'APPROVED'),
    ).toHaveLength(1);
    expect(
      h.events.filter((event) => event.action === 'SUPERSEDED'),
    ).toHaveLength(1);
  });

  it('fails closed for an empty CLIENT_MANAGER building scope', async () => {
    const h = harness();
    await expect(
      h.service.downloadPrivateFile('file-v1', 'org-a', [], true),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(h.events).toHaveLength(0);
  });

  it('denies download before the approved effective date', async () => {
    const h = harness();
    h.rows[0].lifecycleState = 'APPROVED';
    h.rows[0].effectiveAt = new Date(Date.now() + 60_000);
    await expect(
      h.service.downloadPrivateFile('file-v1', 'org-a'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('requires explicit historical authorization for a superseded download', async () => {
    const h = harness();
    h.rows[0].lifecycleState = 'SUPERSEDED';
    await expect(
      h.service.downloadPrivateFile('file-v1', 'org-a'),
    ).rejects.toBeInstanceOf(NotFoundException);
    h.rows[0].historicalDownloadAllowedAt = new Date();
    await expect(
      h.service.downloadPrivateFile('file-v1', 'org-a'),
    ).resolves.toMatchObject({ name: 'plan.pdf' });
  });

  it('denies a scheduled superseded version after its cutoff', async () => {
    const h = harness();
    h.rows[0].lifecycleState = 'APPROVED';
    h.rows[0].effectiveAt = new Date(Date.now() - 120_000);
    h.rows[0].supersededEffectiveAt = new Date(Date.now() - 60_000);
    await expect(
      h.service.downloadPrivateFile('file-v1', 'org-a'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
