import { toCustomerSafeBooking } from './customer-safe-booking-projection';

const forbiddenKeys = new Set([
  'assignedUserId',
  'assignedUser',
  'advisorId',
  'advisorUserId',
  'assignments',
  'bookingAssignments',
  'commitmentVersionId',
  'currentCommitmentVersionId',
  'pendingCommitmentVersionId',
  'canonicalFingerprint',
  'projectAdvisorEligibility',
  'eligibility',
  'priority',
  'schedulingConflicts',
  'privateCalendar',
  'email',
]);

function collectForbiddenKeys(value: unknown, found: string[] = []): string[] {
  if (!value || typeof value !== 'object') return found;
  for (const [key, nested] of Object.entries(value)) {
    if (forbiddenKeys.has(key)) found.push(key);
    collectForbiddenKeys(nested, found);
  }
  return found;
}

describe('customer-safe Booking projection', () => {
  const internalBooking = {
    id: 'booking-public-id',
    projectId: 'project-public-id',
    activityId: 'activity-public-id',
    activityType: 'visite',
    requestedDate: new Date('2027-03-01T15:00:00.000Z'),
    reportedDate: null,
    duration: 120,
    participants: 4,
    comment: 'Customer comment',
    status: 'DEMANDEE',
    refuseReason: null,
    createdAt: new Date('2027-02-01T12:00:00.000Z'),
    assignedUserId: 'advisor-private-id',
    assignedUser: {
      id: 'advisor-private-id',
      firstName: 'Private',
      lastName: 'Advisor',
      email: 'advisor@booking-gate.invalid',
    },
    assignments: [{ id: 'assignment-private-id', status: 'PENDING' }],
    pendingCommitmentVersionId: 'commitment-private-id',
    pendingCommitmentVersion: { canonicalFingerprint: 'fingerprint-private' },
    eligibility: { id: 'eligibility-private-id', priority: 1 },
    project: {
      id: 'project-public-id',
      name: 'Synthetic customer project',
      internalNotes: 'private',
      client: { id: 'private-client-relation' },
      building: {
        id: 'building-public-id',
        name: 'Synthetic customer site',
        timeZone: 'America/Toronto',
        privateCalendar: ['private'],
      },
    },
  };

  it('allowlists the exact customer Booking response shape recursively', () => {
    const projection = toCustomerSafeBooking(internalBooking);
    expect(projection).toEqual({
      id: 'booking-public-id',
      projectId: 'project-public-id',
      activityId: 'activity-public-id',
      activityType: 'visite',
      requestedDate: new Date('2027-03-01T15:00:00.000Z'),
      reportedDate: null,
      duration: 120,
      participants: 4,
      comment: 'Customer comment',
      status: 'DEMANDEE',
      refuseReason: null,
      createdAt: new Date('2027-02-01T12:00:00.000Z'),
      project: {
        id: 'project-public-id',
        name: 'Synthetic customer project',
        building: {
          id: 'building-public-id',
          name: 'Synthetic customer site',
          timeZone: 'America/Toronto',
        },
      },
    });
    expect(collectForbiddenKeys(projection)).toEqual([]);
    expect(JSON.stringify(projection)).not.toContain('advisor-private');
    expect(JSON.stringify(projection)).not.toContain('fingerprint-private');
    expect(JSON.stringify(projection)).not.toContain('eligibility-private');
  });

  it.each([
    'DEMANDEE',
    'CONFIRMEE',
    'REPORTEE',
    'REASSIGNEE',
    'REFUSEE',
    'ANNULEE',
    'COMPLETEE',
  ])('preserves the canonical customer-visible %s status', (status) => {
    expect(toCustomerSafeBooking({ ...internalBooking, status }).status).toBe(
      status,
    );
  });

  it('fails closed for an unsupported internal status', () => {
    expect(() =>
      toCustomerSafeBooking({ ...internalBooking, status: 'INTERNAL_ONLY' }),
    ).toThrow('Unsupported customer Booking status');
  });
});
