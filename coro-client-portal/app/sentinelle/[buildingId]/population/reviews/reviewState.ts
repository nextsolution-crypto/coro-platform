export const reviewStatusLabel: Record<string, string> = {
  DRAFT: "Brouillon",
  IN_REVIEW: "En revue",
  FINALIZED: "Finalisé",
};
export const confidentialityLabel: Record<string, string> = {
  RESTRICTED: "Accès restreint",
  BUILDING_TEAM: "Équipe du bâtiment",
  ORGANIZATION: "Organisation",
  ADVISOR: "Conseiller",
};
export const findingCategoryLabel: Record<string, string> = {
  STRENGTH: "Point fort",
  GAP: "Lacune",
  OBSERVATION: "Observation",
  NON_COMPLIANCE: "Non-conformité",
  RISK: "Risque",
  IMPROVEMENT_OPPORTUNITY: "Occasion d’amélioration",
};
export const severityLabel: Record<string, string> = {
  CRITICAL: "Critique",
  HIGH: "Élevée",
  MEDIUM: "Modérée",
  LOW: "Faible",
  INFORMATIONAL: "Information",
};
export const recommendationStatusLabel: Record<string, string> = {
  PROPOSED: "Proposée",
  ACCEPTED: "Acceptée",
  REJECTED: "Rejetée",
  DEFERRED: "Reportée",
};
export const actionStatusLabel: Record<string, string> = {
  PLANNED: "Planifiée",
  IN_PROGRESS: "En cours",
  COMPLETED: "Réalisation déclarée",
  VERIFIED: "Vérifiée",
  CLOSED: "Fermée",
  CANCELLED: "Annulée",
};
export const evidenceTypeLabel: Record<string, string> = {
  NOTE: "Note",
  DOCUMENT: "Document",
  PHOTO: "Photo",
  LINK: "Lien",
  SYSTEM_REFERENCE: "Référence CORO",
};
export function nextAction(status: string) {
  return status === "PLANNED"
    ? "START"
    : status === "IN_PROGRESS"
      ? "COMPLETE"
      : status === "COMPLETED"
        ? "VERIFY"
        : status === "VERIFIED"
          ? "CLOSE"
          : "READ_ONLY";
}
export function isOverdue(
  dueDate: string | null,
  status: string,
  now = new Date(),
) {
  return Boolean(
    dueDate &&
    !["CLOSED", "CANCELLED"].includes(status) &&
    new Date(dueDate) < now,
  );
}
