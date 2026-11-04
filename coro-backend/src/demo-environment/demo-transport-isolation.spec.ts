import { IncidentService } from '../occupancy/incident.service';
import { OccupancyEmployeesService } from '../occupancy/occupancy-employees.service';
import { RemindersService } from '../reminders/reminders.service';
import { PopulationDeliveryService } from '../population/population-delivery.service';
import { ImportService } from '../configurator/import.service';
import { CustomProceduresService } from '../custom-procedures/custom-procedures.service';

describe('demo tenant transport isolation', () => {
  const organizationId = '916f54ec-af22-45e0-99db-a369d9630002';
  const evaluate = jest.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    evaluate.mockReset().mockResolvedValue({ disposition: 'SIMULATED', eventId: 'event-1' });
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('simulates incident email and SMS without calling Brevo', async () => {
    const service = new IncidentService({} as any, undefined, { evaluate } as any);
    await (service as any).sendEmail(
      { to: 'incident@example.invalid', toName: 'Demo', subject: 'Exercice', html: '<p>Demo</p>' },
      organizationId,
    );
    await (service as any).sendSms('+15145550100', 'Exercice', organizationId);
    expect(evaluate).toHaveBeenCalledTimes(2);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('simulates Sentinelle PIN delivery without exposing the PIN to policy evidence', async () => {
    const service = new OccupancyEmployeesService({} as any, { evaluate } as any);
    await (service as any).sendPinEmail(
      {
        id: 'employee-1',
        organizationId,
        email: 'employee@example.invalid',
        firstName: 'Alex',
        lastName: 'Démo',
        pin: '1234',
      },
      { id: 'building-1', name: 'Bâtiment Démo' },
    );
    expect(evaluate).toHaveBeenCalledWith(expect.objectContaining({
      organizationId,
      operation: 'SENTINELLE_EMPLOYEE_PIN',
      payload: { employeeId: 'employee-1', buildingId: 'building-1' },
    }));
    expect(JSON.stringify(evaluate.mock.calls)).not.toContain('1234');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('simulates scheduled reminders without calling Brevo', async () => {
    const service = new RemindersService({} as any, {} as any, { evaluate } as any);
    await (service as any).sendReminderEmail({
      organizationId,
      to: 'advisor@example.invalid',
      toName: 'Conseiller Démo',
      projectName: 'Projet Démo',
      clientName: 'Client Démo',
      buildingName: 'Bâtiment Démo',
      daysSince: 7,
      isUrgent: false,
      isConseiller: true,
    });
    expect(evaluate).toHaveBeenCalledWith(expect.objectContaining({
      organizationId,
      operation: 'SIGNATURE_REMINDER',
    }));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('simulates Population delivery before provider configuration is read', async () => {
    const previousKey = process.env.BREVO_API_KEY;
    delete process.env.BREVO_API_KEY;
    try {
      const service = new PopulationDeliveryService({ evaluate } as any);
      const result = await service.sendSms(
        '+15145550100',
        'Exercice fictif',
        organizationId,
        'POPULATION_ALERT',
        'demo-alert-1',
      );
      expect(result.provider).toBe('DEMO_SIMULATED');
      expect(result.providerMessageId).toBe('demo-simulated:event-1');
      expect(global.fetch).not.toHaveBeenCalled();
    } finally {
      if (previousKey === undefined) delete process.env.BREVO_API_KEY;
      else process.env.BREVO_API_KEY = previousKey;
    }
  });

  it('blocks paid configurator AI for the demo tenant before network access', async () => {
    const service = new ImportService({ evaluate } as any);
    await expect(service.analyzeWithClaude('Document fictif', organizationId)).rejects.toThrow(
      'EXTERNAL_AI_DISABLED_FOR_DEMO',
    );
    expect(evaluate).toHaveBeenCalledWith(expect.objectContaining({
      organizationId,
      operation: 'CONFIGURATOR_DOCUMENT_IMPORT',
    }));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('blocks custom procedure AI after canonical project authorization', async () => {
    const prisma = { project: { findFirst: jest.fn().mockResolvedValue({ id: 'project-1' }) } };
    const service = new CustomProceduresService(prisma as any, { evaluate } as any);
    await expect(service.generateFromText(
      'Procédure fictive suffisamment longue pour franchir la validation locale sans appeler un fournisseur externe.',
      'project-1',
      { userId: 'user-1', organizationId, role: 'ADMIN' } as any,
    )).rejects.toThrow('EXTERNAL_AI_DISABLED_FOR_DEMO');
    expect(prisma.project.findFirst).toHaveBeenCalled();
    expect(evaluate).toHaveBeenCalledWith(expect.objectContaining({
      organizationId,
      operation: 'CUSTOM_PROCEDURE_GENERATION',
    }));
  });
});
