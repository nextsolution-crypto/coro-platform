import { BookingEligibilityService } from './booking-eligibility.service';

function tx(explicit: unknown[], project: unknown, activeIds: string[]) {
  return {
    projectAdvisorEligibility: { findMany: jest.fn().mockResolvedValue(explicit) },
    project: { findFirst: jest.fn().mockResolvedValue(project) },
    user: { findMany: jest.fn().mockResolvedValue(activeIds.map((id) => ({ id }))) },
  } as any;
}

describe('BookingEligibilityService.resolveEligible', () => {
  const service = new BookingEligibilityService({} as any);
  const input = { organizationId: 'org', projectId: 'p1' };

  it('garde la liste explicite quand elle existe', async () => {
    const explicit = [{ advisorUserId: 'a', priority: 1 }];
    const client = tx(explicit, null, []);
    await expect(service.resolveEligible(client, input)).resolves.toBe(explicit);
    expect(client.project.findFirst).not.toHaveBeenCalled();
  });

  it('retombe sur le conseiller du mandat puis le propriétaire actifs', async () => {
    const client = tx([], { userId: 'owner', mandate: { ownerId: 'mandate' } }, ['owner', 'mandate']);
    await expect(service.resolveEligible(client, input)).resolves.toEqual([
      { id: null, advisorUserId: 'mandate', priority: 100 },
      { id: null, advisorUserId: 'owner', priority: 101 },
    ]);
  });

  it('ignore les comptes inactifs et les doublons', async () => {
    const client = tx([], { userId: 'owner', mandate: { ownerId: 'owner' } }, []);
    await expect(service.resolveEligible(client, input)).resolves.toEqual([]);
  });
});
