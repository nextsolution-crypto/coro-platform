import {
  approvedPlanStorageKey,
  planReference,
  resolveApprovedPlans,
  sha256,
  stageApprovedPlans,
} from './approved-plan-blobs';

const pdf = Buffer.from('%PDF-1.7 plan');
const row = {
  id: 'plan-1',
  section: 'IMPLANTATION',
  name: 'Plan RDC',
  fileName: 'rdc.pdf',
  fileSize: pdf.length,
  emissionDate: null,
  revision: 'B',
  order: 0,
  fileBase64: pdf.toString('base64'),
};

describe('plans approuvés par référence (M1-10)', () => {
  it("garde une référence et l'empreinte, sans le fichier", () => {
    const ref = planReference(row);
    expect(ref).not.toHaveProperty('fileBase64');
    expect(ref.sha256).toBe(sha256(pdf));
    expect(approvedPlanStorageKey('org/a', ref.sha256)).toBe(`tenant-org_a/approved-plans/${ref.sha256}.pdf`);
  });

  it('copie une fois, de façon idempotente', async () => {
    const storage = {
      uploadPrivateImmutable: jest
        .fn()
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('PRIVATE_OBJECT_ALREADY_EXISTS')),
      downloadPrivate: jest.fn(),
    };
    const db = { buildingPlan: { findMany: jest.fn().mockResolvedValue([row]) } };
    await expect(stageApprovedPlans(storage, db, 'org-a', 'p')).resolves.toBe(1);
    await expect(stageApprovedPlans(storage, db, 'org-a', 'p')).resolves.toBe(0);
    expect(db.buildingPlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { projectId: 'p', project: { organizationId: 'org-a' } } }),
    );
  });

  it('relit le fichier stocké et vérifie son empreinte', async () => {
    const storage = { uploadPrivateImmutable: jest.fn(), downloadPrivate: jest.fn().mockResolvedValue(pdf) };
    const db = { buildingPlan: { findMany: jest.fn() } };
    const [plan] = await resolveApprovedPlans([planReference(row)], {
      storage,
      db,
      organizationId: 'org-a',
      projectId: 'p',
    });
    expect(Buffer.from(plan.fileBase64, 'base64').equals(pdf)).toBe(true);
    expect(db.buildingPlan.findMany).not.toHaveBeenCalled();
  });

  it("n'accepte la ligne courante que si son contenu est identique", async () => {
    const storage = {
      uploadPrivateImmutable: jest.fn(),
      downloadPrivate: jest.fn().mockRejectedValue(new Error('PRIVATE_OBJECT_NOT_FOUND')),
    };
    const ref = planReference(row);
    const same = { buildingPlan: { findMany: jest.fn().mockResolvedValue([row]) } };
    await expect(
      resolveApprovedPlans([ref], { storage, db: same, organizationId: 'o', projectId: 'p' }),
    ).resolves.toHaveLength(1);
    const changed = {
      buildingPlan: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ ...row, fileBase64: Buffer.from('%PDF-autre').toString('base64') }]),
      },
    };
    await expect(
      resolveApprovedPlans([ref], { storage, db: changed, organizationId: 'o', projectId: 'p' }),
    ).rejects.toThrow('APPROVED_PLAN_UNAVAILABLE');
  });

  it('laisse passer les anciens snapshots avec base64 inclus', async () => {
    const db = { buildingPlan: { findMany: jest.fn() } };
    await expect(
      resolveApprovedPlans([row], { db, organizationId: 'o', projectId: 'p' }),
    ).resolves.toEqual([row]);
  });
});
