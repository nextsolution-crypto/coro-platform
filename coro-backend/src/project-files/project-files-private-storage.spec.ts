import { NotFoundException } from '@nestjs/common';
import { ProjectFilesService } from './project-files.service';

describe('ProjectFilesService private storage authority', () => {
  const bytes = Buffer.from('synthetic private project document');

  function harness() {
    const project = {
      id: 'project-a',
      organizationId: 'org-a',
      buildingId: 'building-a',
      userId: 'advisor-a',
      name: 'Synthetic project',
    };
    const rows: any[] = [];
    const prisma: any = {
      project: {
        findFirst: jest.fn(async ({ where }: any) =>
          where.id === project.id &&
          where.organizationId === project.organizationId
            ? project
            : null,
        ),
      },
      projectFile: {
        findFirst: jest.fn(async ({ where }: any) => {
          const row = rows.find((candidate) => candidate.id === where.id);
          if (!row || row.organizationId !== where.organizationId) return null;
          if (where.visibility && row.visibility !== where.visibility)
            return null;
          if (
            where.project?.buildingId?.in &&
            !where.project.buildingId.in.includes(project.buildingId)
          )
            return null;
          return row;
        }),
        findMany: jest.fn(async () => rows),
        create: jest.fn(async ({ data }: any) => {
          const row = { ...data, createdAt: new Date(), versions: [] };
          rows.push(row);
          return row;
        }),
      },
    };
    const objects = new Map<string, Buffer>();
    const storage: any = {
      uploadPrivateImmutable: jest.fn(async (payload: Buffer, key: string) => {
        objects.set(key, Buffer.from(payload));
        return { storageKey: key };
      }),
      downloadPrivate: jest.fn(async (key: string) => {
        const result = objects.get(key);
        if (!result) throw new Error('PRIVATE_OBJECT_NOT_FOUND');
        return Buffer.from(result);
      }),
      uploadFile: jest.fn(),
    };
    const service = new ProjectFilesService(prisma, storage, {
      create: jest.fn(),
    } as any);
    return { service, prisma, storage, rows, objects };
  }

  it('stores new documents privately with tenant-scoped immutable keys', async () => {
    const h = harness();
    const result: any = await h.service.uploadFile({
      projectId: 'project-a',
      organizationId: 'org-a',
      name: 'plan.pdf',
      category: 'documents_reference',
      buffer: bytes,
      mimeType: 'application/pdf',
      size: bytes.length,
      visibility: 'shared',
      uploadedById: 'admin-a',
    });

    expect(h.storage.uploadFile).not.toHaveBeenCalled();
    expect(h.storage.uploadPrivateImmutable).toHaveBeenCalledWith(
      bytes,
      expect.stringMatching(
        /^tenant-org-a\/project-files\/project-a\/[0-9a-f-]+\/plan\.pdf$/,
      ),
      'application/pdf',
    );
    expect(result.url).toBe('private:project-file');
    expect(result).not.toHaveProperty('storageKey');
    expect(h.rows[0].storageKey).toContain(
      'tenant-org-a/project-files/project-a/',
    );
  });

  it('downloads private bytes only after tenant and project scope checks', async () => {
    const h = harness();
    const uploaded: any = await h.service.uploadFile({
      projectId: 'project-a',
      organizationId: 'org-a',
      name: 'plan.pdf',
      category: 'documents_reference',
      buffer: bytes,
      mimeType: 'application/pdf',
      size: bytes.length,
      visibility: 'shared',
    });

    await expect(
      h.service.downloadPrivateFile(uploaded.id, 'org-a'),
    ).resolves.toMatchObject({ buffer: bytes, name: 'plan.pdf' });
    await expect(
      h.service.downloadPrivateFile(uploaded.id, 'org-b'),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      h.service.downloadPrivateFile(uploaded.id, 'org-a', ['building-b'], true),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      h.service.downloadPrivateFile(uploaded.id, 'org-a', [], true),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('preserves historical public URLs without reading private storage', async () => {
    const h = harness();
    h.rows.push({
      id: 'legacy-file',
      organizationId: 'org-a',
      projectId: 'project-a',
      name: 'legacy.pdf',
      url: 'https://coro-storage.tor1.digitaloceanspaces.com/legacy.pdf',
      storageKey: 'legacy.pdf',
      visibility: 'shared',
    });

    await expect(
      h.service.getSignedUrl('legacy-file', 'org-a'),
    ).resolves.toEqual({
      url: 'https://coro-storage.tor1.digitaloceanspaces.com/legacy.pdf',
      name: 'legacy.pdf',
    });
    await expect(
      h.service.downloadPrivateFile('legacy-file', 'org-a'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(h.storage.downloadPrivate).not.toHaveBeenCalled();
  });

  it('does not expose private storage keys in file or version metadata', async () => {
    const h = harness();
    h.prisma.projectFile.findMany.mockResolvedValue([
      {
        id: 'root',
        storageKey: 'private/root',
        url: 'private:project-file',
        versions: [
          {
            id: 'version',
            storageKey: 'private/version',
            url: 'private:project-file',
          },
        ],
      },
    ]);
    const result = await h.service.getFilesForProject(
      'project-a',
      undefined,
      'org-a',
    );
    expect(JSON.stringify(result)).not.toContain('storageKey');
  });
});
