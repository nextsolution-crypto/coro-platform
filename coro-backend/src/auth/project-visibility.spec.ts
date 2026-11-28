import { projectReadWhere } from './project-access';

describe('Visibilité des projets', () => {
  const base = { userId: 'u1', organizationId: 'o1', role: 'OPERATOR', email: 'u1@example.com' };

  it('Ouverte (défaut) : tout conseiller lit les projets de son organisation', () => {
    expect(projectReadWhere(base)).toEqual({ organizationId: 'o1' });
    expect(projectReadWhere({ ...base, projectVisibility: 'OPEN' })).toEqual({ organizationId: 'o1' });
  });

  it('Restreinte : ses projets, ses affectations, ses tâches et les approbations en attente', () => {
    const where: any = projectReadWhere({ ...base, projectVisibility: 'RESTRICTED' });
    expect(where.organizationId).toBe('o1');
    expect(where.OR).toEqual(
      expect.arrayContaining([
        { userId: 'u1' },
        { activities: { some: { assigneeEmail: { equals: 'u1@example.com', mode: 'insensitive' } } } },
        { documentReviewRequests: { some: { status: 'PENDING' } } },
      ]),
    );
  });

  it('Restreinte ne limite pas la coordination de planification', () => {
    expect(projectReadWhere({ ...base, projectVisibility: 'RESTRICTED', planningCoordinator: true })).toEqual({ organizationId: 'o1' });
  });

  it('Restreinte ne limite pas l’administrateur', () => {
    expect(projectReadWhere({ ...base, role: 'ADMIN', projectVisibility: 'RESTRICTED' })).toEqual({ organizationId: 'o1' });
  });
});
