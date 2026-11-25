import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ProceduresService } from './procedures.service';

const advisor = { userId: 'u-advisor', organizationId: 'org-a', role: 'OPERATOR' } as any;
const colleague = { userId: 'u-other', organizationId: 'org-a', role: 'OPERATOR' } as any;
const admin = { userId: 'u-admin', organizationId: 'org-a', role: 'ADMIN' } as any;

function setup(variant: any = { id: 'v1', ownerId: 'u-advisor', organizationId: 'org-a', procedureId: 'pd-5', sharedWithOrganization: false, content: { code: 'P005' }, procedure: { code: 'P005' } }) {
  const prisma: any = {
    procedureDefault: { findUnique: jest.fn(async ({ where }) => (where.id === 'pd-5' || where.code === 'P005' ? { id: 'pd-5' } : null)) },
    procedureVariant: {
      findFirst: jest.fn(async ({ where }) => {
        const visible = variant.ownerId === where.OR[0].ownerId || variant.sharedWithOrganization;
        return where.id === variant.id && where.organizationId === variant.organizationId && visible ? variant : null;
      }),
      update: jest.fn(async ({ data }) => ({ ...variant, ...data })),
      delete: jest.fn(async () => variant),
      create: jest.fn(async ({ data }) => ({ id: 'v2', sharedWithOrganization: false, ...data, procedure: { code: 'P005' } })),
    },
    user: { findUnique: jest.fn(async () => ({ firstName: 'Marie', lastName: 'Tremblay', email: 'm@x' })) },
    project: { findFirst: jest.fn(async () => ({ id: 'proj-1' })) },
  };
  const service = new ProceduresService(prisma);
  return { service, prisma };
}

describe('versions de procédures', () => {
  it('enregistre une version nommée, au nom du conseiller', async () => {
    const { service, prisma } = setup();
    const out = await service.createVariant('p005_fuite_gaz', { name: '  P005 — hôpital ', content: { code: 'P005' }, sourceProjectId: 'proj-1' }, advisor);
    expect(prisma.procedureVariant.create.mock.calls[0][0].data).toMatchObject({ procedureId: 'pd-5', ownerId: 'u-advisor', ownerName: 'Marie Tremblay', name: 'P005 — hôpital', organizationId: 'org-a' });
    expect(out).toMatchObject({ isMine: true, code: 'P005', sharedWithOrganization: false });
  });

  it('exige un nom', async () => {
    const { service } = setup();
    await expect(service.createVariant('pd-5', { name: ' ', content: {} }, advisor)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('seul l’auteur partage sa version; un collègue ne la voit pas tant qu’elle est privée', async () => {
    const { service } = setup();
    await expect(service.updateVariant('v1', { sharedWithOrganization: true }, colleague)).rejects.toThrow('Version introuvable');
    await expect(service.updateVariant('v1', { sharedWithOrganization: true }, advisor)).resolves.toMatchObject({ sharedWithOrganization: true });
  });

  it('un administrateur peut retirer un partage mais pas renommer la version d’un autre', async () => {
    const { service } = setup({ id: 'v1', ownerId: 'u-advisor', organizationId: 'org-a', procedureId: 'pd-5', sharedWithOrganization: true, content: {}, procedure: { code: 'P005' } });
    await expect(service.updateVariant('v1', { sharedWithOrganization: false }, admin)).resolves.toMatchObject({ sharedWithOrganization: false });
    await expect(service.updateVariant('v1', { name: 'X' }, admin)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('seul un administrateur fait d’une version la version de l’organisation', async () => {
    const { service } = setup({ id: 'v1', ownerId: 'u-advisor', organizationId: 'org-a', procedureId: 'pd-5', sharedWithOrganization: true, content: { code: 'P005' }, procedure: { code: 'P005' } });
    await expect(service.promoteVariant('v1', advisor)).rejects.toBeInstanceOf(ForbiddenException);
    const spy = jest.spyOn(service, 'updateForOrganization').mockResolvedValue({ success: true } as any);
    await service.promoteVariant('v1', admin);
    expect(spy).toHaveBeenCalledWith('pd-5', 'org-a', { code: 'P005' });
  });

  it('appliquer une version la copie comme version du projet', async () => {
    const { service } = setup();
    const spy = jest.spyOn(service, 'updateForProject').mockResolvedValue({ success: true } as any);
    await service.applyVariant('v1', 'proj-1', advisor);
    expect(spy).toHaveBeenCalledWith('pd-5', 'proj-1', { code: 'P005' }, advisor);
  });

  it('la version de l’organisation est réservée aux administrateurs', async () => {
    const { service } = setup();
    await expect(service.saveOrganizationVersion('pd-5', { code: 'P005' }, advisor)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
