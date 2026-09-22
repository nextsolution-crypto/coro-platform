import { CapacityService } from './capacity.service';
import { effectiveActivityHours } from './capacity-duration';

const start = () => new Date(Date.now() + 24 * 60 * 60 * 1000);
const beyond = () => new Date(Date.now() + 85 * 24 * 60 * 60 * 1000);

describe('CapacityService workload', () => {
  const users = [
    { id: 'owner', email: 'owner@coro.test', firstName: 'Mathieu', lastName: 'O', role: 'OPERATOR', horaireBase: 40 },
    { id: 'lead', email: 'LEAD@coro.test', firstName: 'Marco', lastName: 'L', role: 'OPERATOR', horaireBase: 40 },
    { id: 'support', email: 'support@coro.test', firstName: 'Solange', lastName: 'S', role: 'OPERATOR', horaireBase: 40 },
  ];
  let prisma: any;
  let activities: any[];
  let mandates: any[];
  let service: CapacityService;

  const activity = (bookings: any[] = [], overrides: Record<string, unknown> = {}) => ({
    id: 'activity', projectId: 'project', type: 'exercice_evacuation', label: 'Exercice',
    customLabel: null, duration: '3h00', dureeHeures: 2, scheduledDate: start(),
    assigneeEmail: 'lead@coro.test', status: 'a_faire', sourceMandate: false,
    project: { id: 'project', userId: 'owner', name: 'Projet', mandate: { ownerId: 'owner' } },
    bookings, ...overrides,
  });
  type BookingFixture = {
    id: string;
    status: string;
    requestedDate: Date;
    reportedDate: Date | null;
    duration: number;
    assignments: unknown[];
  };
  const booking = (status = 'CONFIRMEE', assignments: unknown[] = [], overrides: Partial<BookingFixture> = {}): BookingFixture => ({
    id: 'booking', status, requestedDate: start(), reportedDate: null,
    duration: 180, assignments, ...overrides,
  });
  const assignment = (userId: string, role: string, status = 'ACCEPTED') => ({
    id: `${userId}-${role}-${status}`, userId, role, status,
  });
  const mandate = (hours = 20) => ({ projectId: 'project', ownerId: 'owner', heuresBudgetees: hours, dateLimite: null,
    project: { id: 'project', userId: 'owner', name: 'Projet', documentType: 'PUE', status: 'DRAFT', client: { name: 'Client' } },
  });
  const result = async (id: string) => (await service.getCapacityPlanning('org-a')).find(row => row.userId === id)!;

  beforeEach(() => {
    activities = [];
    mandates = [];
    prisma = {
      user: { findMany: jest.fn().mockResolvedValue(users) },
      taskTimeEntry: { findMany: jest.fn().mockResolvedValue([]) },
      timelogEntry: { findMany: jest.fn().mockResolvedValue([]) },
      projectMandate: { findMany: jest.fn().mockImplementation(() => Promise.resolve(mandates)) },
      projectActivity: { findMany: jest.fn().mockImplementation(() => Promise.resolve(activities)) },
    };
    service = new CapacityService(prisma);
  });

  it('assigns the full Booking duration to accepted LEAD and SUPPORT without charging the owner', async () => {
    activities.push(activity([booking('CONFIRMEE', [assignment('lead', 'LEAD'), assignment('support', 'SUPPORT')])]));
    const rows = await service.getCapacityPlanning('org-a');
    expect(rows.find(row => row.userId === 'lead')?.chargeConfirmee).toBe(3);
    expect(rows.find(row => row.userId === 'support')?.chargeConfirmee).toBe(3);
    expect(rows.find(row => row.userId === 'owner')?.chargeConfirmee).toBe(0);
    expect(rows.find(row => row.userId === 'lead')?.tauxUtilisationConfirmee).toBe(1);
    expect(rows.find(row => row.userId === 'lead')?.chargeDetails).toContainEqual(expect.objectContaining({
      source: 'BOOKING', bookingId: 'booking', activityId: 'activity', role: 'LEAD',
      assignmentStatus: 'ACCEPTED', durationHours: 3,
    }));
  });

  it('keeps PENDING and DEMANDEE provisional and excludes terminal assignment states', async () => {
    activities.push(activity([booking('CONFIRMEE', [
      assignment('lead', 'LEAD', 'ACCEPTED'), assignment('support', 'SUPPORT', 'PENDING'),
      assignment('owner', 'SUPPORT', 'DECLINED'), assignment('owner', 'LEAD', 'REPLACED'),
      assignment('owner', 'SUPPORT', 'REMOVED'),
    ])]));
    expect((await result('lead')).chargeConfirmee).toBe(3);
    expect((await result('support')).chargeProvisoire).toBe(3);
    expect((await result('owner')).chargeFutureTotale).toBe(0);
    activities[0].bookings[0].status = 'DEMANDEE';
    expect((await result('lead')).chargeConfirmee).toBe(0);
    expect((await result('lead')).chargeProvisoire).toBe(3);
  });

  it.each(['ANNULEE', 'REFUSEE', 'COMPLETEE'])('excludes a %s Booking and its linked Activity', async status => {
    activities.push(activity([booking(status, [assignment('lead', 'LEAD')])]));
    expect((await result('lead')).chargeConfirmee).toBe(0);
    expect((await result('owner')).chargeConfirmee).toBe(0);
  });

  it('uses reportedDate and excludes Booking dates outside the 12-week horizon', async () => {
    const item = booking('REPORTEE', [assignment('lead', 'LEAD')], { requestedDate: beyond(), reportedDate: start() });
    activities.push(activity([item], { scheduledDate: beyond() }));
    expect((await result('lead')).chargeConfirmee).toBe(3);
    item.reportedDate = beyond();
    expect((await result('lead')).chargeConfirmee).toBe(0);
    item.reportedDate = new Date(Date.now() - 60_000);
    expect((await result('lead')).chargeConfirmee).toBe(0);
  });

  it('counts an accepted legacy REASSIGNEE Booking as confirmed', async () => {
    activities.push(activity([booking('REASSIGNEE', [assignment('support', 'LEAD')])]));
    expect((await result('support')).chargeConfirmee).toBe(3);
  });

  it('excludes completed and cancelled Activities from the query', async () => {
    await result('lead');
    expect(prisma.projectActivity.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: { notIn: ['annule', 'fait', 'termine'] } }),
    }));
  });

  it('assigns an unlinked legacy Activity by matching email, not project owner', async () => {
    activities.push(activity());
    expect((await result('lead')).chargeConfirmee).toBe(2);
    expect((await result('owner')).chargeConfirmee).toBe(0);
    expect((await result('lead')).chargeDetails).toContainEqual(expect.objectContaining({ source: 'LEGACY_ACTIVITY' }));
  });

  it('falls back to mandate owner then project owner exactly once', async () => {
    activities.push(activity([], { assigneeEmail: 'unknown@coro.test', project: {
      id: 'project', userId: 'owner', name: 'Projet', mandate: { ownerId: 'support' },
    } }));
    expect((await result('support')).chargeConfirmee).toBe(2);
    expect((await result('owner')).chargeConfirmee).toBe(0);
    activities[0].project.mandate.ownerId = null;
    expect((await result('owner')).chargeConfirmee).toBe(2);
  });

  it('excludes a legacy Activity outside the horizon and keeps organization filters', async () => {
    activities.push(activity([], { scheduledDate: beyond() }));
    expect((await result('lead')).chargeConfirmee).toBe(0);
    expect(prisma.projectActivity.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: 'org-a' }) }));
    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: 'org-a' }) }));
  });

  it('attributes mandate remaining hours to one owner without turning time entries into Booking hours', async () => {
    mandates.push({ projectId: 'project', ownerId: 'support', heuresBudgetees: 10, dateLimite: null,
      project: { id: 'project', userId: 'owner', name: 'Projet', documentType: 'PUE', status: 'DRAFT', client: { name: 'Client' } } });
    prisma.taskTimeEntry.findMany.mockResolvedValue([{ userId: 'support', heures: 2, task: { projectId: 'project' } }]);
    expect((await result('support')).heuresRestantesMandats).toBe(8);
    expect((await result('owner')).heuresRestantesMandats).toBe(0);
    expect((await result('support')).heuresTaskTotal).toBe(2);
  });

  it('keeps the full unallocated mandate budget when no Activity is planned', async () => {
    mandates.push(mandate());
    const owner = await result('owner');
    expect(owner.chargeMandatNonVentilee).toBe(20);
    expect(owner.chargePlanifiee).toBe(0);
    expect(owner.chargeEngagee).toBe(20);
  });

  it('subtracts project TaskTimeEntries from every consultant before allocating mandate balance', async () => {
    mandates.push(mandate());
    prisma.taskTimeEntry.findMany.mockResolvedValue([
      { userId: 'lead', heures: 2, task: { projectId: 'project' } },
      { userId: 'support', heures: 3, task: { projectId: 'project' } },
    ]);
    const owner = await result('owner');
    expect(owner.chargeMandatNonVentilee).toBe(15);
    expect(owner.mandatsDetail[0].heuresReelles).toBe(5);
  });

  it('subtracts a planned sourceMandate Activity once from the owner budget', async () => {
    mandates.push(mandate());
    activities.push(activity([], { sourceMandate: true }));
    expect((await result('owner')).chargeMandatNonVentilee).toBe(18);
    expect((await result('lead')).chargePlanifiee).toBe(2);
    expect((await result('owner')).chargeEngagee + (await result('lead')).chargeEngagee).toBe(20);
  });

  it('subtracts each accepted consultant hour on a linked sourceMandate Booking', async () => {
    mandates.push(mandate());
    activities.push(activity([booking('CONFIRMEE', [assignment('lead', 'LEAD'), assignment('support', 'SUPPORT')], { duration: 240 })],
      { sourceMandate: true }));
    const rows = await service.getCapacityPlanning('org-a');
    expect(rows.find(row => row.userId === 'owner')?.chargeMandatNonVentilee).toBe(12);
    expect(rows.find(row => row.userId === 'lead')?.chargePlanifiee).toBe(4);
    expect(rows.find(row => row.userId === 'support')?.chargePlanifiee).toBe(4);
    expect(rows.reduce((sum, row) => sum + row.chargeEngagee, 0)).toBe(20);
  });

  it('does not deduct a manual Activity from a mandate budget on projectId alone', async () => {
    mandates.push(mandate());
    activities.push(activity());
    expect((await result('owner')).chargeMandatNonVentilee).toBe(20);
    expect((await result('lead')).chargePlanifiee).toBe(2);
  });

  it('accumulates several sourceMandate Activities and clamps the unallocated budget at zero', async () => {
    mandates.push(mandate(3));
    activities.push(activity([], { id: 'activity-a', sourceMandate: true }));
    activities.push(activity([], { id: 'activity-b', sourceMandate: true }));
    const owner = await result('owner');
    expect(owner.chargeMandatNonVentilee).toBe(0);
    expect(owner.mandatsDetail[0].heuresPlanifieesMandat).toBe(4);
    expect((await result('lead')).chargePlanifiee).toBe(4);
  });

  it('does not consume confirmed mandate budget with provisional assignments', async () => {
    mandates.push(mandate());
    activities.push(activity([booking('DEMANDEE', [assignment('lead', 'LEAD'), assignment('support', 'SUPPORT', 'PENDING')])],
      { sourceMandate: true }));
    expect((await result('owner')).chargeMandatNonVentilee).toBe(20);
    expect((await result('lead')).chargeProvisoire).toBe(3);
    expect((await result('support')).chargeProvisoire).toBe(3);
  });
});

describe('effectiveActivityHours', () => {
  const activity = { type: 'exercice_table', duration: '2h30', dureeHeures: 1.5 };
  it('prefers Booking minutes then explicit Activity hours', () => {
    expect(effectiveActivityHours(activity, { duration: 180 })).toBe(3);
    expect(effectiveActivityHours(activity)).toBe(1.5);
  });
  it('parses Activity duration before catalogue and fallback', () => {
    expect(effectiveActivityHours({ ...activity, dureeHeures: null })).toBe(2.5);
    expect(effectiveActivityHours({ type: 'exercice_table', duration: 'Variable' })).toBe(2);
    expect(effectiveActivityHours({ type: 'other', duration: 'Variable' })).toBe(2);
  });
});
