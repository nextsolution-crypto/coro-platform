type InternalCommitmentVersion = {
  id: string;
  versionNumber: number;
  status: string;
  changeType: string;
  projectId: string;
  activityId: string | null;
  buildingId: string;
  advisorId: string;
  startAt: Date;
  endAt: Date;
  durationMinutes: number;
  canonicalFingerprint: string;
};

type InternalAssignment = Record<string, unknown> & {
  userId: string;
  commitmentVersionId?: string | null;
  commitmentVersion?: InternalCommitmentVersion | null;
};

type InternalBooking = Record<string, unknown> & {
  assignments?: InternalAssignment[];
};

export function toInternalBookingProjection<T extends InternalBooking>(
  booking: T,
  actorUserId: string,
) {
  return {
    ...booking,
    assignments: (booking.assignments ?? []).map((assignment) => {
      const { commitmentVersionId, commitmentVersion, ...publicAssignment } =
        assignment;

      if (assignment.userId !== actorUserId) return publicAssignment;

      return {
        ...publicAssignment,
        governedCommitment: Boolean(commitmentVersionId),
        commitmentVersion: commitmentVersion
          ? {
              id: commitmentVersion.id,
              versionNumber: commitmentVersion.versionNumber,
              status: commitmentVersion.status,
              changeType: commitmentVersion.changeType,
              projectId: commitmentVersion.projectId,
              activityId: commitmentVersion.activityId,
              buildingId: commitmentVersion.buildingId,
              advisorId: commitmentVersion.advisorId,
              startAt: commitmentVersion.startAt,
              endAt: commitmentVersion.endAt,
              durationMinutes: commitmentVersion.durationMinutes,
              expectedFingerprint: commitmentVersion.canonicalFingerprint,
            }
          : null,
      };
    }),
  };
}
