import { createAssignmentNotification } from './booking-assignment-notifications';

function fakeTx(activity: unknown) {
  return {
    projectActivity: { findFirst: jest.fn().mockResolvedValue(activity) },
    notification: { create: jest.fn().mockImplementation(({ data }) => Promise.resolve(data)) },
  } as any;
}

describe('createAssignmentNotification', () => {
  const base = { kind: 'NEW' as const, userId: 'u1', organizationId: 'o1', projectId: 'p1' };

  it("précise l'activité, le bâtiment, la date et l'heure dans le fuseau du bâtiment", async () => {
    const tx = fakeTx({ label: "Formation pour équipe d'urgence", customLabel: null,
      scheduledDate: new Date('2026-12-08T14:00:00Z'),
      project: { building: { name: 'Carrefour des Cèdres', timeZone: 'America/Toronto' } } });
    const data = await createAssignmentNotification(tx, { ...base, activityId: 'a1' });
    expect(data.message).toBe("Formation pour équipe d'urgence — Carrefour des Cèdres — 8 décembre 2026 à 09 h 00. "
      + 'Une nouvelle affectation vous attend dans la planification d’équipe.');
    expect(tx.projectActivity.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'a1', project: { organizationId: 'o1' } } }));
  });

  it("garde le message générique sans activité", async () => {
    const tx = fakeTx(null);
    const data = await createAssignmentNotification(tx, base);
    expect(data.message).toBe('Une nouvelle affectation vous attend dans la planification d’équipe.');
    expect(tx.projectActivity.findFirst).not.toHaveBeenCalled();
  });
});
