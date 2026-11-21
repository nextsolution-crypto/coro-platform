import { IncidentService, sortPanicMembers } from './incident.service';

describe('Panic trigger trace and identity (audit M2-02, M2-04, M2-06, M2-07)', () => {
  function harness() {
    const prisma: any = {
      building: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'building-1',
          name: 'Tour QA',
          address: '1 rue Test',
          city: 'Montréal',
          province: 'QC',
          responsableEmail: 'resp@example.invalid',
          responsablePhone: '514 555 0101',
          responsableFirstName: 'Rita',
          responsableLastName: 'Resp',
          client: { name: 'Client', contactEmail: 'corpo@example.invalid', contactPhone: null },
        }),
      },
      clientUser: {
        findFirst: jest.fn().mockResolvedValue({ firstName: 'Martin', lastName: 'Session', email: 'm@example.invalid' }),
      },
      occupancyRecord: { findMany: jest.fn().mockResolvedValue([]) },
      buildingEmployee: { findMany: jest.fn().mockResolvedValue([]) },
      incidentEvent: { findFirst: jest.fn().mockResolvedValue(null) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const service = new IncidentService(prisma, undefined, { evaluate: jest.fn() } as any) as any;
    service.sendEmail = jest.fn().mockResolvedValue(true);
    service.sendSms = jest.fn().mockResolvedValue(false);
    return { service, prisma };
  }

  it('uses the session identity, not the browser-supplied name', async () => {
    const { service, prisma } = harness();
    await service.triggerPanic(
      'building-1',
      { triggeredBy: 'Faux Nom', emergencyType: 'URGENCE' },
      'org-1',
      { clientUserId: 'client-user-1' },
    );
    const smsText = service.sendSms.mock.calls[0][1] as string;
    expect(smsText).toContain('Martin Session');
    expect(smsText).not.toContain('Faux Nom');
    expect(prisma.auditLog.create.mock.calls[0][0].data.clientUserId).toBe('client-user-1');
  });

  it('records a permanent trace with masked per-recipient outcomes and counts accepted channels only', async () => {
    const { service, prisma } = harness();
    service.sendEmail.mockImplementation(async (mail: { to: string }) => mail.to.startsWith('resp'));
    const result = await service.triggerPanic(
      'building-1',
      { triggeredBy: 'x', emergencyType: 'URGENCE' },
      'org-1',
      { clientUserId: 'client-user-1' },
    );
    expect(result.notifiedCount).toBe(1);
    const data = prisma.auditLog.create.mock.calls[0][0].data;
    expect(data.action).toBe('PANIC_TRIGGERED');
    expect(data.metadata.contacts).toEqual([
      expect.objectContaining({ email: 're***@example.invalid', emailAccepted: true, phone: '***0101', smsAccepted: false, reached: true }),
      expect.objectContaining({ email: 'co***@example.invalid', emailAccepted: false, reached: false }),
    ]);
    expect(JSON.stringify(data.metadata)).not.toContain('resp@example.invalid');
  });

  it('puts the coordinator first, then first aiders, then by configured priority', () => {
    const sorted = sortPanicMembers([
      { id: 'other', emergencyRoles: [{ role: 'EVACUATION_GUIDE', priority: 1 }] },
      { id: 'aider', emergencyRoles: [{ role: 'FIRST_AIDER', priority: 1 }] },
      { id: 'coord-backup', emergencyRoles: [{ role: 'COORDINATOR', priority: 2 }] },
      { id: 'coord', emergencyRoles: [{ role: 'COORDINATOR', priority: 1 }] },
      { id: 'none', emergencyRoles: [] },
    ] as any);
    expect(sorted.map((m: any) => m.id)).toEqual(['coord', 'coord-backup', 'aider', 'other', 'none']);
  });
});
