import { ApprovalService } from './approval.service';

const day = 86_400_000;
const now = new Date('2026-12-10T19:00:00Z');

function harness(opts: { approvedDaysAgo: number; reminders?: number[]; signed?: boolean }) {
  const approvedAt = new Date(now.getTime() - opts.approvedDaysAgo * day);
  const prisma: any = {
    project: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'p1', name: 'PMU — Tour', documentType: 'PMU', organizationId: 'o1',
          clientId: 'c1', buildingId: 'b1', approvedAt, client: { name: 'Client' },
          projectVersions: [{ signatures: opts.signed ? [{ id: 's' }] : [] }],
        },
      ]),
    },
    auditLog: {
      findMany: jest.fn().mockResolvedValue(
        (opts.reminders ?? []).map((d) => ({ createdAt: new Date(now.getTime() - d * day) })),
      ),
      create: jest.fn().mockResolvedValue({}),
    },
    clientUser: {
      findMany: jest.fn().mockResolvedValue([{ email: 'c@x.test', firstName: 'C', lastName: 'U' }]),
    },
  };
  const email: any = { sendDocumentReminder: jest.fn().mockResolvedValue({ success: true }) };
  const service = new ApprovalService(prisma, {} as any, email, {} as any, {} as any);
  return { service, prisma, email };
}

describe('Relances de signature client', () => {
  it('relance un document validé non signé après 3 jours', async () => {
    const h = harness({ approvedDaysAgo: 3 });
    await expect(h.service.sendSignatureReminders(now)).resolves.toEqual({ sent: 1 });
    expect(h.email.sendDocumentReminder).toHaveBeenCalledWith(expect.objectContaining({ reminderNumber: 1, daysWaiting: 3 }));
    expect(h.prisma.auditLog.create.mock.calls[0][0].data).toMatchObject({ action: 'DOCUMENT_REMINDER', projectId: 'p1' });
    // Seuls les comptes du client ayant accès au bâtiment.
    expect(h.prisma.clientUser.findMany.mock.calls[0][0].where).toMatchObject({ clientId: 'c1', isActive: true });
  });

  it('ne relance pas un document signé, ni trop tôt, ni au-delà du maximum', async () => {
    for (const opts of [
      { approvedDaysAgo: 10, signed: true },
      { approvedDaysAgo: 8, reminders: [1] },
      { approvedDaysAgo: 30, reminders: [3, 6, 9, 12, 15] },
    ]) {
      const h = harness(opts);
      await expect(h.service.sendSignatureReminders(now)).resolves.toEqual({ sent: 0 });
      expect(h.email.sendDocumentReminder).not.toHaveBeenCalled();
    }
  });
});

describe('Dernière demande de corrections', () => {
  const actor = { userId: 'u1', organizationId: 'o1', role: 'OPERATOR' };
  function svc(project: any, audit: any, refusal: any) {
    const prisma: any = {
      project: { findFirst: jest.fn().mockResolvedValue(project) },
      auditLog: { findFirst: jest.fn().mockResolvedValue(audit) },
      projectComment: { findFirst: jest.fn().mockResolvedValue(refusal) },
    };
    return new ApprovalService(prisma, {} as any, {} as any, {} as any, {} as any);
  }

  it('retourne le refus client le plus récent, avec son motif', async () => {
    const service = svc(
      { id: 'p', status: 'IN_PROGRESS', approvedAt: new Date('2026-11-20'), submittedAt: new Date('2026-11-19') },
      { createdAt: new Date('2026-11-21'), metadata: { previousStatus: 'VALIDATED', reason: 'maj' }, user: { firstName: 'D', lastName: 'C' } },
      { createdAt: new Date('2026-11-22'), contenu: '[Refus client] Section 2 à corriger', clientUser: { firstName: 'M', lastName: 'G' } },
    );
    await expect(service.getLastReturn('p', actor)).resolves.toMatchObject({
      type: 'CLIENT_REFUSED', by: 'M G', reason: 'Section 2 à corriger',
    });
  });

  it('distingue un retour en révision d\'un déverrouillage, et ne montre rien hors « En cours »', async () => {
    const internal = svc(
      { id: 'p', status: 'IN_PROGRESS', approvedAt: null, submittedAt: new Date('2026-11-20') },
      { createdAt: new Date('2026-11-21'), metadata: { previousStatus: 'REVIEW', reason: 'Module 2' }, user: null },
      null,
    );
    await expect(internal.getLastReturn('p', actor)).resolves.toMatchObject({ type: 'INTERNAL_RETURN', reason: 'Module 2' });
    const review = svc({ id: 'p', status: 'REVIEW', approvedAt: null, submittedAt: new Date() }, null, null);
    await expect(review.getLastReturn('p', actor)).resolves.toBeNull();
  });
});
