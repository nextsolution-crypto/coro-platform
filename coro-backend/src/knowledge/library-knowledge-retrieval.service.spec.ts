/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */
import { NotFoundException } from '@nestjs/common';
import { DeterministicEmbeddingService } from './deterministic-embedding.service';
import { LibraryKnowledgeRetrievalService } from './library-knowledge-retrieval.service';

const date = (day: number) =>
  new Date(`2026-11-${String(day).padStart(2, '0')}T12:00:00.000Z`);
const source = (content: string, updatedAt = date(1)) => ({
  id: 'procedure-fire',
  code: 'FIRE',
  content: { body: content },
  isActive: true,
  createdAt: date(1),
  updatedAt,
});

function fixture(
  options: {
    defaults?: any[];
    organization?: any[];
    project?: any[];
    projectAllowed?: boolean;
  } = {},
) {
  const prisma: any = {
    procedureDefault: {
      findMany: jest.fn(
        async () => options.defaults ?? [source('Fermer la vanne azur.')],
      ),
      findFirst: jest.fn(
        async () =>
          (options.defaults ?? [source('Fermer la vanne azur.')])[0] ?? null,
      ),
    },
    procedureOverride: {
      findMany: jest.fn(async ({ where }: any) =>
        where.projectId === null
          ? (options.organization ?? [])
          : (options.project ?? []),
      ),
    },
    project: {
      findFirst: jest.fn(async () =>
        options.projectAllowed === false ? null : { id: 'project-a' },
      ),
    },
  };
  return {
    prisma,
    service: new LibraryKnowledgeRetrievalService(
      prisma,
      new DeterministicEmbeddingService(),
    ),
  };
}

const internal: any = {
  type: 'INTERNAL_USER',
  id: 'user-a',
  organizationId: 'org-a',
  role: 'ADMIN',
};

describe('LibraryKnowledgeRetrievalService', () => {
  it('retrieves catalog-only information with exact typed provenance', async () => {
    const { service } = fixture();
    const [hit] = await service.search(internal, 'vanne azur');
    expect(hit).toMatchObject({
      sourceType: 'LIBRARY_PROCEDURE',
      sourceScope: 'GLOBAL',
    });
    expect(hit.text).toContain('vanne azur');
    expect(hit.href).toBe('/knowledge/library-sources/procedure-fire');
    expect(hit.sourceVersion).toMatch(
      /^2026-11-01T12:00:00\.000Z:[a-f0-9]{64}$/,
    );
  });

  it('uses the most specific authorized source and invalidates stale provenance after change', async () => {
    const first = fixture({
      organization: [
        {
          ...source('Consigne organisation alpha.', date(2)),
          procedureId: 'procedure-fire',
          organizationId: 'org-a',
          projectId: null,
        },
      ],
    });
    const [before] = await first.service.search(internal, 'organisation alpha');
    const second = fixture({
      organization: [
        {
          ...source('Consigne organisation beta.', date(3)),
          procedureId: 'procedure-fire',
          organizationId: 'org-a',
          projectId: null,
        },
      ],
    });
    const [after] = await second.service.search(internal, 'organisation beta');
    expect(before.sourceScope).toBe('ORGANIZATION');
    expect(after.sourceVersion).not.toBe(before.sourceVersion);
    expect(after.sourceFingerprint).not.toBe(before.sourceFingerprint);
    expect(
      (await second.service.search(internal, 'organisation alpha'))[0]?.text,
    ).not.toContain('alpha');
  });

  it('removes an inactive effective source from current retrieval', async () => {
    const override = {
      ...source('Retirée', date(2)),
      procedureId: 'procedure-fire',
      organizationId: 'org-a',
      projectId: null,
      isActive: false,
    };
    expect(
      await fixture({ organization: [override] }).service.search(
        internal,
        'retiree',
      ),
    ).toEqual([]);
  });

  it('fails closed before project-scoped retrieval for another tenant or assignment', async () => {
    const { service, prisma } = fixture({ projectAllowed: false });
    const manager: any = {
      type: 'CLIENT_USER',
      id: 'client-user',
      clientId: 'client-a',
      organizationId: 'org-a',
      role: 'CLIENT_MANAGER',
      buildingIds: ['building-a'],
    };
    await expect(
      service.search(manager, 'vanne', 'project-other'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.procedureDefault.findMany).not.toHaveBeenCalled();
  });

  it('does not grant a manager project access without its canonical client identity', async () => {
    const { service, prisma } = fixture();
    const manager: any = {
      type: 'CLIENT_USER',
      id: 'client-user',
      organizationId: 'org-a',
      role: 'CLIENT_MANAGER',
      buildingIds: ['building-a'],
    };
    await expect(
      service.search(manager, 'vanne', 'project-a'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.project.findFirst).not.toHaveBeenCalled();
  });

  it('opens the same authorized effective source and provenance used by retrieval', async () => {
    const override = {
      ...source('Consigne projet exacte.', date(4)),
      procedureId: 'procedure-fire',
      organizationId: 'org-a',
      projectId: 'project-a',
    };
    const { service } = fixture({ project: [override] });
    const opened = await service.source(
      internal,
      'procedure-fire',
      'project-a',
    );
    expect(opened).toMatchObject({
      id: 'procedure-fire',
      scope: 'PROJECT',
      content: { body: 'Consigne projet exacte.' },
    });
    expect(opened.version).toMatch(/^2026-11-04T12:00:00\.000Z:[a-f0-9]{64}$/);
  });
});
