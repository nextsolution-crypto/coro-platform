import { toInternalBookingProjection } from './internal-booking-projection';

describe('internal Booking projection', () => {
  const commitment = {
    id: 'commitment-a',
    versionNumber: 2,
    status: 'PROPOSED',
    changeType: 'INITIAL_REQUEST',
    projectId: 'project-a',
    activityId: 'activity-a',
    buildingId: 'building-a',
    advisorId: 'advisor-a',
    startAt: new Date('2026-11-10T14:00:00.000Z'),
    endAt: new Date('2026-11-10T15:00:00.000Z'),
    durationMinutes: 60,
    canonicalFingerprint: 'a'.repeat(64),
  };

  it('exposes exact canonical evidence only on the authenticated advisor assignment', () => {
    const projected = toInternalBookingProjection(
      {
        id: 'booking-a',
        assignments: [
          {
            id: 'assignment-a',
            userId: 'advisor-a',
            status: 'PENDING',
            commitmentVersionId: commitment.id,
            commitmentVersion: commitment,
          },
          {
            id: 'assignment-b',
            userId: 'advisor-b',
            status: 'PENDING',
            commitmentVersionId: 'commitment-b',
            commitmentVersion: {
              ...commitment,
              id: 'commitment-b',
              advisorId: 'advisor-b',
              canonicalFingerprint: 'b'.repeat(64),
            },
          },
        ],
      },
      'advisor-a',
    );

    expect(projected.assignments[0]?.governedCommitment).toBe(true);
    expect(projected.assignments[0]?.commitmentVersion).toMatchObject({
      id: commitment.id,
      expectedFingerprint: commitment.canonicalFingerprint,
      startAt: commitment.startAt,
      endAt: commitment.endAt,
      durationMinutes: 60,
    });
    expect(projected.assignments[0]).not.toHaveProperty('commitmentVersionId');
    expect(projected.assignments[1]).not.toHaveProperty('commitmentVersion');
    expect(projected.assignments[1]).not.toHaveProperty('commitmentVersionId');
    expect(projected.assignments[1]).not.toHaveProperty('governedCommitment');
  });

  it('marks an own historical assignment without fabricating commitment evidence', () => {
    const projected = toInternalBookingProjection(
      {
        id: 'booking-a',
        assignments: [
          {
            id: 'assignment-a',
            userId: 'advisor-a',
            status: 'PENDING',
            commitmentVersionId: null,
            commitmentVersion: null,
          },
        ],
      },
      'advisor-a',
    );

    expect(projected.assignments[0]).toEqual(
      expect.objectContaining({
        governedCommitment: false,
        commitmentVersion: null,
      }),
    );
  });
});
