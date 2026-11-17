import { OperationalDirectiveStatus, OperationalFollowUpStatus } from '@prisma/client';

const directiveTransitions: Record<string, OperationalDirectiveStatus[]> = {
  SUBMITTED: ['DRAFT'], APPROVED: ['SUBMITTED'], PUBLISHED: ['APPROVED'], REVOKED: ['PUBLISHED'],
};
const followUpTransitions: Record<OperationalFollowUpStatus, OperationalFollowUpStatus[]> = {
  OPEN: ['ASSIGNED', 'CANCELLED'], ASSIGNED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'ASSIGNED', 'CANCELLED'], COMPLETED: ['VERIFIED', 'IN_PROGRESS'],
  VERIFIED: ['CLOSED', 'IN_PROGRESS'], CLOSED: ['OPEN'], CANCELLED: ['OPEN'],
};
export const isDirectiveTransitionAllowed = (from: OperationalDirectiveStatus, to: string) => directiveTransitions[to]?.includes(from) ?? false;
export const isFollowUpTransitionAllowed = (from: OperationalFollowUpStatus, to: OperationalFollowUpStatus) => followUpTransitions[from].includes(to);
