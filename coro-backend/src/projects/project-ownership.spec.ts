import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { canWriteProject, projectAccessWhere, projectReadWhere } from '../auth/project-access';
import { ProjectsService } from './projects.service';

const operator = { userId: 'op-a', organizationId: 'org-a', role: 'OPERATOR' };
const admin = { userId: 'admin-a', organizationId: 'org-a', role: 'ADMIN' };

describe('Projets : lecture organisation, écriture propriétaire', () => {
  it('un opérateur lit tous les projets de son organisation', () => {
    expect(projectReadWhere(operator)).toEqual({ organizationId: 'org-a' });
  });

  it('un opérateur n\'écrit que dans ses projets ; un administrateur écrit partout', () => {
    expect(projectAccessWhere(operator)).toEqual({ organizationId: 'org-a', userId: 'op-a' });
    expect(projectAccessWhere(admin)).toEqual({ organizationId: 'org-a' });
    expect(canWriteProject(operator, { organizationId: 'org-a', userId: 'op-a' })).toBe(true);
    expect(canWriteProject(operator, { organizationId: 'org-a', userId: 'someone' })).toBe(false);
    expect(canWriteProject(admin, { organizationId: 'org-a', userId: 'someone' })).toBe(true);
    expect(canWriteProject(admin, { organizationId: 'org-b', userId: 'admin-a' })).toBe(false);
  });

  it('seul un administrateur change le propriétaire, vers un conseiller actif de son organisation', async () => {
    const prisma: any = {
      project: {
        findFirst: jest.fn().mockResolvedValue({ id: 'p1', userId: 'admin-a', name: 'P' }),
        update: jest.fn().mockResolvedValue({}),
      },
      user: { findFirst: jest.fn().mockResolvedValue({ id: 'op-a', firstName: 'Op', lastName: 'A' }) },
    };
    const service = new ProjectsService(prisma);

    await expect(service.changeOwner('p1', 'op-a', operator)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.project.update).not.toHaveBeenCalled();

    await expect(service.changeOwner('p1', 'op-a', admin)).resolves.toMatchObject({ changed: true, userId: 'op-a', previousUserId: 'admin-a' });
    expect(prisma.user.findFirst.mock.calls[0][0].where).toMatchObject({ id: 'op-a', organizationId: 'org-a', isActive: true });
    expect(prisma.project.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { userId: 'op-a' } });

    prisma.user.findFirst.mockResolvedValueOnce(null);
    await expect(service.changeOwner('p1', 'foreign', admin)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('le détail indique si le conseiller peut modifier le projet', async () => {
    const prisma: any = {
      project: { findFirst: jest.fn().mockResolvedValue({ id: 'p1', organizationId: 'org-a', userId: 'admin-a' }) },
    };
    const service = new ProjectsService(prisma);
    await expect(service.findOne('p1', operator)).resolves.toMatchObject({ canWrite: false });
    await expect(service.findOne('p1', admin)).resolves.toMatchObject({ canWrite: true });
  });
});
