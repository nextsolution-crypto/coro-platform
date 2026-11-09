import { OccupancyEmployeesService } from './occupancy-employees.service';

describe('Employee CSV contractual SMS consent', () => {
  it.each([
    [undefined, '', false],
    [false, '', false],
    [true, '', true],
    [true, 'non', false],
    [true, 'inconnu', false],
    [false, 'oui', true],
  ])('uses bulk attestation %s and row %s as %s', async (attestation, row, expected) => {
    const prisma = { building: { findFirst: jest.fn().mockResolvedValue({ id: 'building-a' }) } };
    const service = new OccupancyEmployeesService(prisma as any);
    const create = jest.spyOn(service, 'createEmployee').mockResolvedValue({ id: 'employee-a' } as any);
    const result = await service.importEmployeesCsv('building-a', `Prénom,Nom,Consentement SMS\nQA,Fictif,${row}`, 'org-a', false, attestation);
    expect(result.created).toBe(1);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ smsConsent: expected }), 'org-a', false);
  });
});
