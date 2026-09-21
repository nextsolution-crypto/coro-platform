/** @type {Record<string, string>} */
export const actionStatusLabel = {
  PLANNED: "Planifiée",
  IN_PROGRESS: "En cours",
  COMPLETED: "Réalisation déclarée",
  VERIFIED: "Vérifiée",
  CLOSED: "Fermée",
  CANCELLED: "Annulée",
};

/** @type {Record<string, string>} */
export const priorityLabel = { CRITICAL: "Critique", WARNING: "À surveiller", INFO: "Information" };
/** @type {Record<string, string>} */
export const evidenceTypeLabel = {
  NOTE: "Note", LINK: "Lien", DOCUMENT: "Document", PHOTO: "Photo", SYSTEM_REFERENCE: "Référence CORO",
};
/** @type {Record<string, string>} */
export const verdictLabel = { ACCEPTED: "Acceptée", REJECTED: "Rejetée" };

export function actionsAvailable(status, permissions, dualControlBlocked = false) {
  const has = (permission) => permissions.includes(permission);
  return {
    start: status === "PLANNED" && has("CORRECTIVE_ACTION_EDIT"),
    addEvidence: status === "IN_PROGRESS" && has("CORRECTIVE_ACTION_EDIT"),
    withdrawEvidence: status === "IN_PROGRESS" && has("CORRECTIVE_ACTION_EDIT"),
    complete: status === "IN_PROGRESS" && has("CORRECTIVE_ACTION_COMPLETE"),
    verify: status === "COMPLETED" && has("CORRECTIVE_ACTION_VERIFY") && !dualControlBlocked,
    close: status === "VERIFIED" && has("CORRECTIVE_ACTION_CLOSE"),
  };
}
