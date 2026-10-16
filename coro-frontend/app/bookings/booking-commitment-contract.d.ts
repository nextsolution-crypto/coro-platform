export type AdvisorCommitment = {
  id: string;
  versionNumber: number;
  status: string;
  changeType: string;
  projectId: string;
  activityId: string | null;
  buildingId: string;
  advisorId: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  expectedFingerprint: string;
};

export type AdvisorAssignment = {
  userId?: string;
  governedCommitment?: boolean;
  commitmentVersion?: AdvisorCommitment | null;
};

export const MISSING_COMMITMENT_MESSAGE: string;
export const STALE_COMMITMENT_MESSAGE: string;
export function getCommitmentEvidence(
  assignment: AdvisorAssignment,
  booking?: Record<string, unknown>,
):
  | { kind: "legacy"; commitment: null }
  | { kind: "missing"; commitment: null }
  | { kind: "governed"; commitment: AdvisorCommitment };
export function buildAdvisorResponsePayload(
  assignment: AdvisorAssignment,
  status: string,
  booking?: Record<string, unknown>,
): Record<string, string>;
export function isStaleCommitmentError(message: string): boolean;
