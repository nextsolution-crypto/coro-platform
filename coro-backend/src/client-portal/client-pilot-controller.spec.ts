import { ForbiddenException } from '@nestjs/common';

jest.mock('../export/export.service', () => ({
  ExportService: class ExportService {},
}));

const { ClientPortalController } = require('./client-portal.controller');

describe('ClientPortalController pilot delivery restrictions', () => {
  const actor = {
    sub: 'client-user-a',
    organizationId: 'org-pilot',
    clientId: 'client-a',
    role: 'CLIENT_MANAGER',
    buildingIds: ['building-a'],
  };
  const portal = {
    assertBuildingAccess: jest.fn(),
    assertPilotOperationAllowed: jest.fn(),
    getPilotPolicy: jest.fn(),
    getProject: jest.fn(),
  };
  const employees = {
    createInvitation: jest.fn(),
    createEmployee: jest.fn(),
  };
  const controller = new ClientPortalController(
    portal as any,
    {} as any,
    employees as any,
    {} as any,
    {} as any,
    {} as any,
  );

  beforeEach(() => jest.clearAllMocks());

  it('denies an external invitation before creating a row or provider work', async () => {
    portal.assertPilotOperationAllowed.mockImplementation(() => {
      throw new ForbiddenException('pilot restriction');
    });
    await expect(
      controller.createSentinelleInvitation(
        'building-a',
        { email: 'visitor@example.invalid' },
        { clientUser: actor },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(employees.createInvitation).not.toHaveBeenCalled();
  });

  it('preserves local employee creation while suppressing external PIN email', async () => {
    portal.getPilotPolicy.mockReturnValue({ externalEmployeeEmail: false });
    employees.createEmployee.mockResolvedValue({ id: 'employee-a' });
    await expect(
      controller.createSentinelleEmployee(
        'building-a',
        { firstName: 'QA', lastName: 'Pilot', email: 'qa@example.invalid' },
        { clientUser: actor },
      ),
    ).resolves.toEqual({ id: 'employee-a' });
    expect(employees.createEmployee).toHaveBeenCalledWith(
      expect.objectContaining({ buildingId: 'building-a' }),
      'org-pilot',
      false,
    );
  });

  it('denies official PDF recovery before contacting private storage', async () => {
    portal.getProject.mockResolvedValue({
      officialPdfFr: 'https://private.invalid/document.pdf',
    });
    portal.getPilotPolicy.mockReturnValue({ officialPdf: false });
    const send = jest.fn();
    const status = jest.fn().mockReturnValue({ json: jest.fn() });
    const fetchSpy = jest.spyOn(global, 'fetch');
    try {
      await controller.downloadOfficialPdf(
        'project-a',
        'fr',
        { clientUser: actor },
        { status, send } as any,
      );
      expect(status).toHaveBeenCalledWith(403);
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(send).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
