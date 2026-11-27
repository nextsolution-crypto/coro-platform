import { Prisma } from '@prisma/client';

export type AssignmentNotificationKind = 'NEW' | 'ACCEPTED' | 'DECLINED' | 'REPLACED' | 'REMOVED' |
  'SCHEDULE_CHANGED' | 'SCHEDULE_CANCELLED';

const content: Record<AssignmentNotificationKind, { title: string; message: string }> = {
  NEW: { title: 'Nouvelle affectation', message: 'Une nouvelle affectation vous attend dans la planification d’équipe.' },
  ACCEPTED: { title: 'Affectation acceptée', message: 'Un conseiller a accepté son affectation.' },
  DECLINED: { title: 'Affectation refusée', message: 'Un conseiller a refusé son affectation.' },
  REPLACED: { title: 'Affectation remplacée', message: 'Votre affectation a été remplacée.' },
  REMOVED: { title: 'Affectation retirée', message: 'Votre affectation a été retirée.' },
  SCHEDULE_CHANGED: { title: 'Planification modifiée', message: 'Le créneau de votre affectation a été modifié.' },
  SCHEDULE_CANCELLED: { title: 'Planification annulée', message: 'Votre affectation a été retirée du calendrier.' },
};

export async function createAssignmentNotification(tx: Prisma.TransactionClient, input: {
  kind: AssignmentNotificationKind; userId: string; organizationId: string; projectId: string;
  activityId?: string | null;
}) {
  const copy = content[input.kind];
  const detail = input.activityId ? await activityDetail(tx, input.activityId, input.organizationId) : null;
  return tx.notification.create({ data: {
    userId: input.userId, organizationId: input.organizationId, projectId: input.projectId,
    type: `BOOKING_ASSIGNMENT_${input.kind}`, title: copy.title,
    message: detail ? `${detail}. ${copy.message}` : copy.message,
  } });
}

// « Formation pour équipe d'urgence — Carrefour des Cèdres — 8 décembre 2026 à 09 h 00 »
async function activityDetail(tx: Prisma.TransactionClient, activityId: string, organizationId: string) {
  // Le détail est un plus : sans accès aux activités (client de test partiel), on garde le message générique.
  if (typeof tx.projectActivity?.findFirst !== 'function') return null;
  const activity = await tx.projectActivity.findFirst({
    where: { id: activityId, project: { organizationId } },
    select: { label: true, customLabel: true, scheduledDate: true,
      project: { select: { building: { select: { name: true, timeZone: true } } } } },
  });
  if (!activity) return null;
  const parts = [activity.customLabel || activity.label, activity.project?.building?.name];
  if (activity.scheduledDate) {
    // Une activité planifiée porte son heure de début (UTC) : on l'affiche dans le fuseau du bâtiment.
    parts.push(activity.scheduledDate.toLocaleString('fr-CA', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
      timeZone: activity.project?.building?.timeZone || 'America/Toronto' }));
  }
  return parts.filter(Boolean).join(' — ');
}
