/** Notification in-app de l'app conseiller (cloche et page Notifications). */
export interface AdvisorNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  projectId?: string | null;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

/** Où mène un clic sur une notification : son lien, sinon le projet, sinon le planning. */
export function notificationDestination(notification: Pick<AdvisorNotification, 'type' | 'projectId' | 'link'>): string | null {
  if (notification.link && notification.link.startsWith('/') && !notification.link.startsWith('//')) return notification.link;
  if (notification.type.startsWith('BOOKING_ASSIGNMENT_')) return '/planning';
  if (notification.projectId) return `/projects/${notification.projectId}`;
  return null;
}

/** « il y a 5 min », « il y a 3 h », « il y a 2 j ». */
export function notificationAge(createdAt: string, now = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - new Date(createdAt).getTime()) / 60000));
  if (minutes < 1) return 'à l’instant';
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.round(hours / 24)} j`;
}

/** Chiffre de la pastille : au-delà de 99, « 99+ ». */
export function badgeLabel(count: number): string {
  return count > 99 ? '99+' : String(count);
}
