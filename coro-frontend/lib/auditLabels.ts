// Libellés du Journal de projet : chaque code d'action devient une phrase lisible.
// Quand la description enregistrée est déjà une phrase, elle est conservée.
type Entry = { label: string; icon: string };

const LABELS: Record<string, Entry> = {
  GENERATE: { label: 'Document généré', icon: '⚙' },
  EDIT_SECTION: { label: 'Section du document modifiée', icon: '✏️' },
  EXPORT: { label: 'Aperçu ou export PDF', icon: '📄' },
  DOCUMENT_PDF_EXPORTED: { label: 'Document exporté en PDF', icon: '📄' },
  STATUS_CHANGE: { label: 'Statut du projet modifié', icon: '🔄' },
  VERSION_SAVE: { label: 'Version du document enregistrée', icon: '💾' },
  VERSION_RESTORE: { label: 'Version du document restaurée', icon: '↩️' },
  VERSION_DELETE: { label: 'Version du document supprimée', icon: '🗑' },
  PROCEDURE_TOGGLE: { label: 'Procédure activée ou désactivée', icon: '🔧' },
  PROCEDURE_EDIT: { label: 'Procédure modifiée', icon: '📝' },
  TEMPLATE_CREATE: { label: 'Modèle créé à partir du projet', icon: '📋' },
  OWNER_CHANGE: { label: 'Propriétaire du projet changé', icon: '👤' },
  PROJECT_DUPLICATED: { label: 'Projet créé à partir de l’année précédente', icon: '⧉' },
  REVIEW_SUBMITTED: { label: 'Document soumis pour approbation', icon: '📨' },
  REVIEW_APPROVED: { label: 'Document approuvé', icon: '✅' },
  REVIEW_RETURNED: { label: 'Document retourné pour corrections', icon: '↩️' },
  DOCUMENT_REMINDER: { label: 'Rappel d’approbation envoyé', icon: '🔔' },
  MANDATE_SERVICE_ADDED: { label: 'Service ajouté au mandat', icon: '💼' },
  MANDATE_SERVICE_UPDATED: { label: 'Service du mandat modifié', icon: '💼' },
  MANDATE_SERVICE_REMOVED: { label: 'Service retiré du mandat', icon: '💼' },
  MANDATE_SERVICE_RESTORED: { label: 'Service du mandat rétabli', icon: '💼' },
  MANDATE_SERVICE_ACTIVITY_CREATED: { label: 'Activité créée depuis le mandat', icon: '📅' },
  MANDATE_SERVICE_LEGACY_ACTIVITY_ADOPTED: { label: 'Activité existante rattachée au mandat', icon: '📅' },
  MANDATE_SERVICE_REPLACEMENT_CREATED: { label: 'Activité de remplacement créée', icon: '📅' },
  MANDATE_SALE_VALIDATED: { label: 'Vente du mandat validée', icon: '💲' },
  PROJECT_MANDATE_SALE_VALIDATED: { label: 'Vente du mandat validée', icon: '💲' },
  CREATE: { label: 'Élément créé', icon: '➕' },
  DELETE: { label: 'Élément supprimé', icon: '🗑' },
  PLANNED: { label: 'Activité planifiée', icon: '📅' },
  PLANNING_ACTIVITY_CREATED: { label: 'Activité créée depuis la planification', icon: '📅' },
  PLANNING_ACTIVITY_CANCELLED: { label: 'Activité annulée', icon: '✖' },
  SCHEDULE_UPDATED: { label: 'Horaire de l’activité modifié', icon: '🕑' },
  RESCHEDULED: { label: 'Activité reportée', icon: '🕑' },
  SCHEDULE_CANCELLED: { label: 'Planification annulée', icon: '✖' },
  TEAM_REASSIGNED: { label: 'Équipe de l’activité modifiée', icon: '👥' },
  ACTIVITY_TASK_LISTS_INSTANTIATED: { label: 'Listes de tâches ajoutées à l’activité', icon: '☑' },
  BOOKING_REQUESTED: { label: 'Demande de rendez-vous du client', icon: '📨' },
  BOOKING_CANCELLED: { label: 'Rendez-vous annulé', icon: '✖' },
  BOOKING_RESCHEDULE_PROPOSED: { label: 'Nouveau créneau proposé', icon: '🕑' },
  BOOKING_ADVISOR_ELIGIBILITY_GRANTED: { label: 'Conseiller autorisé pour les réservations', icon: '👤' },
  BOOKING_ADVISOR_ELIGIBILITY_REVOKED: { label: 'Conseiller retiré des réservations', icon: '👤' },
};

// Descriptions techniques ou sans accents enregistrées par d'anciennes versions.
const DESCRIPTION_FIXES: Record<string, string> = {
  'Activite planifiee depuis le Planner.': 'Activité planifiée depuis la planification.',
  'Checklists applicables ajoutées à l’activité.': 'Listes de tâches ajoutées à l’activité.',
};

export function auditEntry(action: string, description?: string | null): Entry {
  const known = LABELS[action];
  const text = (description ?? '').trim();
  const readable = text && text !== action && !/^[A-Z0-9_]+$/.test(text);
  const label = readable ? DESCRIPTION_FIXES[text] ?? text : known?.label ?? action.replace(/_/g, ' ').toLowerCase();
  return { label, icon: known?.icon ?? '○' };
}

export type AuditLogRow = {
  id: string;
  action: string;
  description?: string | null;
  createdAt: string;
  user?: { firstName?: string | null; lastName?: string | null } | null;
};

export type AuditGroup = AuditLogRow & { count: number; firstAt: string; label: string; icon: string };

// Les entrées identiques et consécutives (même action, même texte, même personne, même jour)
// sont regroupées : « Aperçu ou export PDF × 11 ».
export function groupAuditLogs(logs: AuditLogRow[]): AuditGroup[] {
  const groups: AuditGroup[] = [];
  for (const log of logs) {
    const entry = auditEntry(log.action, log.description);
    // Les aperçus PDF FR et EN alternent : on les regroupe en une seule ligne.
    const pdfPreview = /^Aperçu PDF/.test(entry.label);
    const label = pdfPreview ? 'Aperçu PDF du document' : entry.label;
    const icon = entry.icon;
    const who = `${log.user?.firstName ?? ''} ${log.user?.lastName ?? ''}`.trim();
    const day = log.createdAt.slice(0, 10);
    const last = groups[groups.length - 1];
    const lastWho = last ? `${last.user?.firstName ?? ''} ${last.user?.lastName ?? ''}`.trim() : '';
    if (last && last.action === log.action && last.label === label && lastWho === who && last.createdAt.slice(0, 10) === day) {
      last.count += 1;
      last.firstAt = log.createdAt;
      continue;
    }
    groups.push({ ...log, count: 1, firstAt: log.createdAt, label, icon });
  }
  return groups;
}
