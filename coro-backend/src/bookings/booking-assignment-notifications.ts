import { Prisma } from '@prisma/client';

export type AssignmentNotificationKind = 'NEW' | 'ACCEPTED' | 'DECLINED' | 'REPLACED' | 'REMOVED' |
  'SCHEDULE_CHANGED' | 'SCHEDULE_CANCELLED';

const content: Record<AssignmentNotificationKind, { title: string; message: string }> = {
  NEW: { title: 'Nouvelle affectation', message: 'Une nouvelle affectation vous attend dans le Planner.' },
  ACCEPTED: { title: 'Affectation acceptée', message: 'Un conseiller a accepté son affectation.' },
  DECLINED: { title: 'Affectation refusée', message: 'Un conseiller a refusé son affectation.' },
  REPLACED: { title: 'Affectation remplacée', message: 'Votre affectation a été remplacée.' },
  REMOVED: { title: 'Affectation retirée', message: 'Votre affectation a été retirée.' },
  SCHEDULE_CHANGED: { title: 'Planification modifiée', message: 'Le créneau de votre affectation a été modifié.' },
  SCHEDULE_CANCELLED: { title: 'Planification annulée', message: 'Votre affectation a été retirée du calendrier.' },
};

export async function createAssignmentNotification(tx: Prisma.TransactionClient, input: {
  kind: AssignmentNotificationKind; userId: string; organizationId: string; projectId: string;
}) {
  const copy = content[input.kind];
  return tx.notification.create({ data: {
    userId: input.userId, organizationId: input.organizationId, projectId: input.projectId,
    type: `BOOKING_ASSIGNMENT_${input.kind}`, title: copy.title, message: copy.message,
  } });
}
