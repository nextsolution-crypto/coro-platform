import { OccupancyEmployeesService } from './occupancy-employees.service';

describe('Sentinelle PIN delivery integrity', () => {
  const previousFetch = global.fetch;
  afterEach(() => {
    global.fetch = previousFetch;
    jest.restoreAllMocks();
  });
  function harness(disposition = 'LIVE') {
    let employee: any;
    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      buildingEmployee: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(
          async ({ data }: any) =>
            (employee = {
              id: 'employee-a',
              pinEmailStatus: 'NOT_REQUESTED',
              ...data,
            }),
        ),
        update: jest.fn(
          async ({ data }: any) => (employee = { ...employee, ...data }),
        ),
        delete: jest.fn(),
      },
      employeeEmergencyRole: { create: jest.fn() },
      employeeQualification: { create: jest.fn() },
    };
    const prisma = {
      ...tx,
      building: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'building-a', name: 'FICTIF' }),
      },
      $transaction: jest.fn((callback: any) => callback(tx)),
    };
    const policy = { evaluate: jest.fn().mockResolvedValue({ disposition }) };
    return {
      prisma,
      tx,
      service: new OccupancyEmployeesService(prisma as any, policy as any),
    };
  }
  const input = {
    buildingId: 'building-a',
    firstName: 'QA',
    lastName: 'FICTIF',
    email: 'qa@example.invalid',
  };
  it.each([400, 401, 403, 429])(
    'records HTTP %i as a refusal without deleting or retrying the employee',
    async (status) => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status }) as any;
      const { service, prisma } = harness();
      const result = await service.createEmployee(input, 'org-a');
      expect(result.pinEmailStatus).toBe('REJECTED');
      expect(prisma.buildingEmployee.delete).not.toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledTimes(1);
    },
  );
  it.each([408, 500, 503])(
    'leaves HTTP %i unknown without retry',
    async (status) => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status }) as any;
      const { service } = harness();
      expect(
        (await service.createEmployee(input, 'org-a')).pinEmailStatus,
      ).toBe('OUTCOME_UNKNOWN');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    },
  );
  it('requires a provider message ID before claiming acceptance', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({}) }) as any;
    const { service } = harness();
    expect((await service.createEmployee(input, 'org-a')).pinEmailStatus).toBe(
      'OUTCOME_UNKNOWN',
    );
  });
  it('records acceptance without claiming delivery', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({ messageId: '<synthetic-id>' }),
      }) as any;
    const { service, tx } = harness();
    const result = await service.createEmployee(input, 'org-a');
    expect(result.pinEmailStatus).toBe('ACCEPTED');
    expect(result.pinEmailMessageId).toBe('<synthetic-id>');
    expect(tx.$executeRaw).toHaveBeenCalled();
  });
  it('keeps the identity after an ambiguous network error', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('synthetic network error')) as any;
    const { service, prisma } = harness();
    expect((await service.createEmployee(input, 'org-a')).pinEmailStatus).toBe(
      'OUTCOME_UNKNOWN',
    );
    expect(prisma.buildingEmployee.delete).not.toHaveBeenCalled();
  });
  it.each(['SIMULATED', 'BLOCKED'])(
    'reports %s distinctly and never calls Brevo',
    async (disposition) => {
      global.fetch = jest.fn() as any;
      const { service } = harness(disposition);
      expect(
        (await service.createEmployee(input, 'org-a')).pinEmailStatus,
      ).toBe(disposition);
      expect(global.fetch).not.toHaveBeenCalled();
    },
  );
  it('does not send when external delivery is disabled', async () => {
    global.fetch = jest.fn() as any;
    const { service } = harness();
    expect(
      (await service.createEmployee(input, 'org-a', false)).pinEmailStatus,
    ).toBe('NOT_REQUESTED');
    expect(global.fetch).not.toHaveBeenCalled();
  });
  it('bounds PIN allocation if no candidate is available', async () => {
    const { service, tx } = harness();
    tx.buildingEmployee.findFirst.mockResolvedValue({
      id: 'occupied',
    } as never);
    await expect(service.createEmployee(input, 'org-a', false)).rejects.toThrow(
      'Aucun PIN disponible',
    );
    expect(tx.buildingEmployee.findFirst).toHaveBeenCalledTimes(100);
    expect(tx.buildingEmployee.create).not.toHaveBeenCalled();
  });
});
