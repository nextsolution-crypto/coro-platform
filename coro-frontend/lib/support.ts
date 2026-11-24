/** Centre d'aide : libellés et helpers partagés par les pages de l'app conseiller. */

export interface SupportTicketSummary {
  id: string;
  reference: string;
  type: string;
  impact: string;
  priority: number;
  status: string;
  queue: string;
  channel: string;
  subject: string;
  createdAt: string;
  updatedAt: string;
  firstResponseDueAt: string;
  firstRespondedAt: string | null;
  firstResponseTarget: string;
  overdue: boolean;
  organizationName?: string | null;
  duplicateCount?: number;
  assignedUserId?: string | null;
}

export interface SupportMessage {
  id: string;
  authorKind: 'REQUESTER' | 'AGENT' | 'SYSTEM';
  authorName: string;
  body: string;
  internal: boolean;
  createdAt: string;
}

export interface SupportAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  messageId: string | null;
  scanStatus: string | null;
  downloadable: boolean;
  createdAt: string;
}

export interface SupportTicketView extends SupportTicketSummary {
  isAgent: boolean;
  isRequester: boolean;
  buildingId: string | null;
  duplicateOfId: string | null;
  context?: { page?: string; userAgent?: string; appVersion?: string; viewport?: string; language?: string } | null;
  messages: SupportMessage[];
  attachments: SupportAttachment[];
}

export const SUPPORT_TYPE_OPTIONS = [
  { value: 'BUG', label: 'Signaler un bug', hint: 'Quelque chose ne fonctionne pas comme prévu.' },
  { value: 'QUESTION', label: 'Poser une question', hint: 'Besoin d’aide ou d’une clarification.' },
  { value: 'SUGGESTION', label: 'Proposer une amélioration', hint: 'Une idée pour améliorer CORO.' },
  { value: 'ACCESS', label: 'Accès ou compte', hint: 'Connexion, droits, invitation, double authentification.' },
  { value: 'OTHER', label: 'Autre', hint: 'Tout autre sujet.' },
] as const;

export const SUPPORT_IMPACT_OPTIONS = [
  { value: 'BLOCKING', label: 'Bloquant', hint: 'Je ne peux plus travailler. Réponse sous 4 h ouvrables.' },
  { value: 'DISRUPTIVE', label: 'Gênant', hint: 'Je contourne, mais c’est pénible. Réponse sous 1 jour ouvrable.' },
  { value: 'MINOR', label: 'Mineur', hint: 'Détail ou confort. Réponse sous 3 jours ouvrables.' },
] as const;

export const SUPPORT_TYPE_LABELS: Record<string, string> = {
  BUG: 'Bug', QUESTION: 'Question', SUGGESTION: 'Suggestion', ACCESS: 'Accès / compte', OTHER: 'Autre',
};

export const SUPPORT_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  NEW: { label: 'Nouveau', color: '#2980B9', bg: '#EBF5FB' },
  IN_PROGRESS: { label: 'En cours', color: '#B9770E', bg: '#FEF9E7' },
  WAITING_REQUESTER: { label: 'En attente du demandeur', color: '#8E44AD', bg: '#F5EEF8' },
  RESOLVED: { label: 'Résolu', color: '#1E8449', bg: '#EAFAF1' },
  CLOSED: { label: 'Fermé', color: '#6C757D', bg: '#F1F3F5' },
};

export const PRIORITY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Bloquant', color: '#C0392B' },
  2: { label: 'Gênant', color: '#E67E22' },
  3: { label: 'Mineur', color: '#6C757D' },
};

/** Contexte technique joint à une nouvelle demande (jamais de jeton ni de paramètre d'URL). */
export function supportContext(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  let page = '';
  try {
    const referrer = document.referrer ? new URL(document.referrer) : null;
    page = referrer && referrer.origin === window.location.origin ? referrer.pathname : '';
  } catch {
    page = '';
  }
  return {
    page,
    userAgent: navigator.userAgent,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    language: navigator.language,
    appVersion: 'app-conseiller',
  };
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString('fr-CA', { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} Mo` : `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}

export const SUPPORT_MAX_BYTES = 25 * 1024 * 1024;
