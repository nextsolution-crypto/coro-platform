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
      panicAlert: { create: jest.fn().mockResolvedValue({ id: 'panic-1' }), update: jest.fn().mockResolvedValue({}) },
      panicRecipient: {
        create: jest.fn().mockImplementation(async ({ data }: any) => ({ id: `recipient-${data.name}`, ...data })),
        update: jest.fn().mockResolvedValue({}),
      },
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

  it('threat to the whole building also reaches consenting occupants with the protective message only', async () => {
    const { service, prisma } = harness();
    prisma.occupancyRecord.findMany.mockResolvedValue([{ employeeId: 'emp-occupant' }]);
    prisma.buildingEmployee.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: 'emp-occupant', firstName: 'Olivier', lastName: 'Occupant', email: null, phone: '514 555 0199', smsConsent: true },
      ]);
    service.sendSms.mockResolvedValue(true);
    const result = await service.triggerPanic(
      'building-1',
      { panicType: 'THREAT', scope: 'BUILDING' },
      'org-1',
      { clientUserId: 'client-user-1' },
    );
    expect(result.occupantCount).toBe(1);
    const occupantSms = service.sendSms.mock.calls.find(([phone]: any[]) => phone === '+15145550199')[1] as string;
    expect(occupantSms).toContain('Composez le 911 une fois en sécurité');
    expect(occupantSms).not.toContain('Martin Session');
    expect(occupantSms).toMatch(/Répondez : https:\/\/client\.getcoro\.io\/alerte\/[A-Za-z0-9_-]{30,}/);
    expect(prisma.panicRecipient.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ category: 'OCCUPANT', audience: 'OCCUPANT', phoneMasked: '***0199' }) }),
    );
  });

  it('a fire alert stays with the team even if the whole building is requested', async () => {
    const { service } = harness();
    const result = await service.triggerPanic('building-1', { panicType: 'FIRE', scope: 'BUILDING' }, 'org-1', { clientUserId: 'client-user-1' });
    expect(result.scope).toBe('TEAM');
    expect(service.sendSms.mock.calls[0][1]).toContain('Déclenchez l’alarme incendie');
  });

  it('records a response from a personal link and refuses an option outside the audience', async () => {
    const { service, prisma } = harness();
    prisma.panicRecipient.findUnique = jest.fn().mockResolvedValue({
      id: 'recipient-1', panicAlertId: 'panic-1', audience: 'OCCUPANT', name: 'Olivier Occupant', responseExpiresAt: new Date(Date.now() + 60_000),
    });
    await expect(service.respondToPanic('x'.repeat(32), 'TAKING_CHARGE')).rejects.toThrow('Réponse invalide');
    await expect(service.respondToPanic('x'.repeat(32), 'SAFE')).resolves.toMatchObject({ response: 'SAFE' });
    expect(prisma.panicRecipient.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'recipient-1' }, data: expect.objectContaining({ response: 'SAFE' }) }));
  });

  it('refuses an expired response link', async () => {
    const { service, prisma } = harness();
    prisma.panicRecipient.findUnique = jest.fn().mockResolvedValue({ id: 'r', audience: 'TEAM', responseExpiresAt: new Date(Date.now() - 1000) });
    await expect(service.respondToPanic('x'.repeat(32), 'SAFE')).rejects.toThrow('Lien invalide ou expiré');
  });
});
