import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CustomProceduresService } from './custom-procedures.service';

const operator = { userId: 'operator-a', organizationId: 'org-a', role: 'OPERATOR' };
const admin = { userId: 'admin-a', organizationId: 'org-a', role: 'ADMIN' };

describe('CustomProceduresService authority inheritance', () => {
  it('denies a foreign project before listing custom procedures', async () => {
    const prisma: any = {
      project: { findFirst: jest.fn().mockResolvedValue(null) },
      customProcedure: { findMany: jest.fn() },
    };
    await expect(new CustomProceduresService(prisma).findAll('foreign-project', operator))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.customProcedure.findMany).not.toHaveBeenCalled();
  });

  it('does not allow an operator to mutate an organization-wide procedure', async () => {
    const prisma: any = {
      customProcedure: {
        findFirst: jest.fn().mockResolvedValue({ id: 'proc-a', projectId: null }),
        update: jest.fn(),
      },
    };
    await expect(new CustomProceduresService(prisma).update('proc-a', { titleFR: 'X' }, operator))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.customProcedure.update).not.toHaveBeenCalled();
  });

  it('maps only approved mutable fields for an organization administrator', async () => {
    const prisma: any = {
      customProcedure: {
        findFirst: jest.fn().mockResolvedValue({ id: 'proc-a', projectId: null }),
        update: jest.fn().mockResolvedValue({ id: 'proc-a' }),
      },
    };
    await new CustomProceduresService(prisma).update('proc-a', {
      titleFR: 'Titre sûr', organizationId: 'org-b', projectId: 'foreign', createdById: 'other',
    }, admin);
    const data = prisma.customProcedure.update.mock.calls[0][0].data;
    expect(data.titleFR).toBe('Titre sûr');
    expect(data.organizationId).toBeUndefined();
    expect(data.projectId).toBeUndefined();
    expect(data.createdById).toBeUndefined();
  });
});
