import { OccupancyEmployeesService } from './occupancy-employees.service';
describe('Sentinelle employee QR overnight continuity', () => {
  it('returns the existing open presence from the preceding day under the employee lock', async () => {
    const employee = {
      id: 'employee-a',
      buildingId: 'building-a',
      organizationId: 'org-a',
    };
    const record = {
      id: 'record-a',
      status: 'IN',
      checkedInAt: new Date(Date.now() - 12 * 3600000),
    };
    const tx = {
      $executeRaw: jest.fn(),
      occupancyRecord: {
        findFirst: jest.fn().mockResolvedValue(record),
        create: jest.fn(),
      },
    };
    const prisma = {
      buildingEmployee: { findFirst: jest.fn().mockResolvedValue(employee) },
      buildingKioskToken: {
        findFirst: jest.fn().mockResolvedValue({ id: 'kiosk-a' }),
      },
      $transaction: jest.fn((fn: any) => fn(tx)),
    };
    const result = await new OccupancyEmployeesService(
      prisma as any,
    ).checkinByQrToken('synthetic-qr', 'synthetic-kiosk');
    expect(result.alreadyIn).toBe(true);
    expect(tx.occupancyRecord.findFirst).toHaveBeenCalledWith({
      where: { employeeId: employee.id, status: 'IN' },
    });
    expect(tx.occupancyRecord.create).not.toHaveBeenCalled();
    expect(tx.$executeRaw).toHaveBeenCalled();
  });
});
