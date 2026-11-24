import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ProjectsService } from './projects.service';

const actor = { userId: 'user-a', organizationId: 'org-a', role: 'OPERATOR' } as any;

function harness() {
  const prisma: any = {
    organization: { findUnique: jest.fn().mockResolvedValue({ id: 'org-a', licenseType: 'ENTERPRISE' }) },
    project: { count: jest.fn().mockResolvedValue(0), create: jest.fn().mockImplementation(({ data }: any) => data) },
    building: { findFirst: jest.fn() },
  };
  return { prisma, service: new ProjectsService(prisma) };
}

const base = { name: ' PMU 2026 ', documentType: 'PMU', year: 2026, buildingId: 'bld_1', userId: 'user-a', organizationId: 'org-a' };

describe('ProjectsService.create', () => {
  it('takes the client from the building when the form sends none', async () => {
    const h = harness();
    h.prisma.building.findFirst.mockResolvedValue({ id: 'bld_1', clientId: 'client-a' });
    const created = await h.service.create(base as any, actor);
    expect(created).toMatchObject({ name: 'PMU 2026', clientId: 'client-a', buildingId: 'bld_1', organizationId: 'org-a' });
    expect(h.prisma.building.findFirst.mock.calls[0][0].where).toEqual({ id: 'bld_1', organizationId: 'org-a' });
  });

  it('refuses a client that does not own the building', async () => {
    const h = harness();
    h.prisma.building.findFirst.mockResolvedValue({ id: 'bld_1', clientId: 'client-a' });
    await expect(h.service.create({ ...base, clientId: 'client-b' } as any, actor)).rejects.toBeInstanceOf(ForbiddenException);
    expect(h.prisma.project.create).not.toHaveBeenCalled();
  });

  it('refuses document types without a configurator and invalid input with 400', async () => {
    const h = harness();
    await expect(h.service.create({ ...base, documentType: 'PGC' } as any, actor)).rejects.toBeInstanceOf(BadRequestException);
    await expect(h.service.create({ ...base, name: '  ' } as any, actor)).rejects.toBeInstanceOf(BadRequestException);
    await expect(h.service.create({ ...base, year: 'abc' } as any, actor)).rejects.toBeInstanceOf(BadRequestException);
    expect(h.prisma.project.create).not.toHaveBeenCalled();
  });
});
