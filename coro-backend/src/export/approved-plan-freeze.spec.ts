import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  assertEditableProject,
  editableProjectAccessWhere,
  EDITABLE_PROJECT_STATUSES,
} from '../auth/project-access';
import {
  captureFrozenExportData,
  frozenExportDataSource,
  liveExportDataSource,
} from './export-frozen-data';
import {
  createReviewSnapshot,
  hashReviewSnapshot,
} from '../approval/document-review-integrity';

/**
 * Audit M1-01 à M1-04 : le PDF officiel approuvé est figé et toutes les
 * écritures documentaires suivent une seule règle d'état.
 */
const admin = { userId: 'admin-a', organizationId: 'org-a', role: 'ADMIN' };

function reader(overrides: Partial<Record<string, any>> = {}) {
  return {
    procedureDefault: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'p1', code: 'P01', content: { v: 1 }, isActive: true, updatedAt: new Date() },
        { id: 'pc1', code: 'PC01', content: { v: 1 }, isActive: true },
      ]),
    },
    procedureOverride: { findMany: jest.fn().mockResolvedValue([]) },
    customProcedure: {
      findMany: jest.fn().mockResolvedValue([{ id: 'ia-1', status: 'ACTIVE' }]),
    },
    module7Data: {
      findUnique: jest.fn().mockResolvedValue({
        projectId: 'project-a',
        quartsData: { jour: 3 },
        photosData: null,
        extraData: {},
      }),
    },
    ...overrides,
  };
}

describe('règle unique des écritures documentaires', () => {
  it('limite les écritures aux plans en brouillon ou en cours', () => {
    expect([...EDITABLE_PROJECT_STATUSES]).toEqual(['DRAFT', 'IN_PROGRESS']);
    expect(editableProjectAccessWhere(admin)).toMatchObject({
      organizationId: 'org-a',
      isActive: true,
      status: { in: ['DRAFT', 'IN_PROGRESS'] },
    });
  });

  it.each(['REVIEW', 'VALIDATED', 'EXPORTED'])(
    'refuse une écriture sur un plan %s avec un message explicite',
    async (status) => {
      const prisma = {
        project: { findFirst: jest.fn().mockResolvedValue({ id: 'p', status }) },
      };
      await expect(assertEditableProject(prisma, 'p', admin)).rejects.toBeInstanceOf(
        ConflictException,
      );
    },
  );

  it('masque un projet archivé, inactif ou non affecté', async () => {
    for (const value of [null, { id: 'p', status: 'ARCHIVED' }]) {
      const prisma = { project: { findFirst: jest.fn().mockResolvedValue(value) } };
      await expect(assertEditableProject(prisma, 'p', admin)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    }
  });

  it('accepte un plan en cours', async () => {
    const prisma = {
      project: {
        findFirst: jest.fn().mockResolvedValue({ id: 'p', status: 'IN_PROGRESS' }),
      },
    };
    await expect(assertEditableProject(prisma, 'p', admin)).resolves.toMatchObject({
      status: 'IN_PROGRESS',
    });
  });
});

describe('PDF officiel figé (snapshot v3)', () => {
  it('capture procédures, surcharges, procédures IA et module 7 dans la portée du projet', async () => {
    const db = reader();
    const frozen = await captureFrozenExportData(db, {
      projectId: 'project-a',
      organizationId: 'org-a',
      content: { module4: { customProcedureIds: ['ia-1', 'ia-1', 7] } },
    });
    expect(frozen.procedureDefaults[0]).not.toHaveProperty('updatedAt');
    expect(frozen.module7).toEqual({ quartsData: { jour: 3 }, photosData: {}, extraData: {} });
    expect(db.procedureOverride.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: 'org-a', projectId: null } }),
    );
    expect(db.procedureOverride.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: 'org-a', projectId: 'project-a' } }),
    );
    expect(db.customProcedure.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: 'org-a', id: { in: ['ia-1'] } }),
      }),
    );
  });

  it('refuse une lecture en direct sans portée organisation et projet', () => {
    expect(() => liveExportDataSource(reader(), '', 'org-a')).toThrow(
      'EXPORT_DATA_SCOPE_MISSING',
    );
    expect(() => liveExportDataSource(reader(), 'project-a', undefined as any)).toThrow(
      'EXPORT_DATA_SCOPE_MISSING',
    );
  });

  it('rend depuis le snapshot même si la base change après approbation', async () => {
    const db = reader();
    const frozen = await captureFrozenExportData(db, {
      projectId: 'project-a',
      organizationId: 'org-a',
      content: { module4: { customProcedureIds: ['ia-1'] } },
    });
    db.procedureDefault.findMany.mockResolvedValue([
      { id: 'p1', code: 'P01', content: { v: 2 }, isActive: true },
    ]);
    const source = frozenExportDataSource(frozen);
    expect((await source.procedureDefaults())[0].content).toEqual({ v: 1 });
    expect(await source.customProcedures(['ia-1'])).toHaveLength(1);
    expect(await source.customProcedures(['autre'])).toHaveLength(0);
    expect(await source.module7()).toEqual(frozen.module7);
  });

  it("inclut les données figées dans l'empreinte d'approbation", async () => {
    const base = {
      project: { id: 'project-a', documentType: 'PMU', year: 2026, configData: {} },
      document: { id: 'd', title: 't', status: 'DRAFT', version: 1, lockVersion: 0, content: {} },
    };
    const frozen = await captureFrozenExportData(reader(), {
      projectId: 'project-a',
      organizationId: 'org-a',
      content: {},
    });
    const v3 = createReviewSnapshot({ ...base, exportData: frozen });
    expect(v3.schemaVersion).toBe(3);
    const changed = structuredClone(frozen);
    (changed.procedureDefaults[0] as any).content = { v: 2 };
    expect(hashReviewSnapshot(createReviewSnapshot({ ...base, exportData: changed }))).not.toBe(
      hashReviewSnapshot(v3),
    );
    expect(createReviewSnapshot(base).schemaVersion).toBe(2);
  });

  it('refuse un snapshot figé incomplet', () => {
    expect(() => frozenExportDataSource({ version: 1 } as any)).toThrow(
      'APPROVED_SNAPSHOT_UNSUPPORTED',
    );
  });
});
