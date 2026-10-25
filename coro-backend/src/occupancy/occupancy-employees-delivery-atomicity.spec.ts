import { OccupancyEmployeesService } from './occupancy-employees.service';

describe('OccupancyEmployeesService delivery atomicity', () => {
  const previousFetch = global.fetch;

  afterEach(() => {
    global.fetch = previousFetch;
    jest.restoreAllMocks();
  });

  function harness() {
    const prisma = {
      building: { findFirst: jest.fn().mockResolvedValue({ id: 'building-a', name: 'Synthetic building' }) },
      buildingEmployee: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'employee-a', firstName: 'QA', lastName: 'Employee', email: 'qa@example.invalid', pin: '1234' }),
        delete: jest.fn().mockResolvedValue({ id: 'employee-a' }),
      },
      employeeEmergencyRole: { create: jest.fn() },
      employeeQualification: { create: jest.fn() },
      visitorInvitation: {
        create: jest.fn().mockResolvedValue({ id: 'invitation-a', firstName: 'QA', lastName: 'Visitor', email: 'visitor@example.invalid', visitDate: new Date(), qrToken: 'qr' }),
        delete: jest.fn().mockResolvedValue({ id: 'invitation-a' }),
      },
    } as any;
    return { prisma, service: new OccupancyEmployeesService(prisma) };
  }

  it('removes a newly created employee when PIN delivery fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('provider unavailable')) as any;
    const { prisma, service } = harness();

    await expect(service.createEmployee({ buildingId: 'building-a', firstName: 'QA', lastName: 'Employee', email: 'qa@example.invalid' }, 'org-a')).rejects.toThrow('provider unavailable');

    expect(prisma.buildingEmployee.delete).toHaveBeenCalledWith({ where: { id: 'employee-a' } });
  });

  it('removes a newly created invitation when delivery fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('provider unavailable')) as any;
    const { prisma, service } = harness();

    await expect(service.createInvitation({ buildingId: 'building-a', firstName: 'QA', lastName: 'Visitor', email: 'visitor@example.invalid', visitDate: new Date().toISOString() }, 'org-a', 'client-user-a')).rejects.toThrow('provider unavailable');

    expect(prisma.visitorInvitation.delete).toHaveBeenCalledWith({ where: { id: 'invitation-a' } });
  });
});
