import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ClientsService } from './clients.service';

function setup(advisorCount = 2) {
  const tx: any = {
    client: { findFirst: jest.fn().mockResolvedValue({ id: 'c1', name: 'Client' }) },
    user: { count: jest.fn().mockResolvedValue(advisorCount) },
    clientTeamMember: {
      findMany: jest.fn().mockResolvedValue([{ userId: 'u1' }, { userId: 'old' }]),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const prisma: any = { $transaction: (fn: any) => fn(tx) };
  const audit: any = { record: jest.fn() };
  return { service: new ClientsService(prisma, {} as any, audit, {} as any), tx, audit };
}

describe('Équipe du client', () => {
  it('remplace l’équipe : retire les absents, ajoute les nouveaux, journalise', async () => {
    const { service, tx, audit } = setup();
    await service.setTeam('c1', ['u1', 'u2'], { userId: 'admin', organizationId: 'o1', role: 'ADMIN' });
    expect(tx.clientTeamMember.deleteMany).toHaveBeenCalledWith({ where: { clientId: 'c1', organizationId: 'o1', userId: { notIn: ['u1', 'u2'] } } });
    expect(tx.clientTeamMember.createMany.mock.calls[0][0].data).toEqual([
      expect.objectContaining({ clientId: 'c1', userId: 'u2', organizationId: 'o1' }),
    ]);
    expect(audit.record).toHaveBeenCalled();
  });

  it('la coordination de planification peut gérer l’équipe, un conseiller non', async () => {
    const { service } = setup(1);
    await expect(service.setTeam('c1', ['u1'], { userId: 'm', organizationId: 'o1', role: 'OPERATOR', planningCoordinator: true })).resolves.toBeTruthy();
    await expect(service.setTeam('c1', ['u1'], { userId: 'x', organizationId: 'o1', role: 'OPERATOR' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuse un conseiller d’une autre organisation ou inactif', async () => {
    const { service } = setup(1);
    await expect(service.setTeam('c1', ['u1', 'ext'], { userId: 'admin', organizationId: 'o1', role: 'ADMIN' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
