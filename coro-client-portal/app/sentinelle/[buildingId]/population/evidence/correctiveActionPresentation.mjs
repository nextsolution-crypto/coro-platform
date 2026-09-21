export function reviewAccessFromResponse(status, hasReview) {
  if (status === 403) return "restricted";
  return hasReview ? "available" : "missing";
}

export function actionAttention(status, permissions, blocked = false) {
  if (status === "COMPLETED" && permissions.includes("CORRECTIVE_ACTION_VERIFY") && !blocked) return "À vérifier";
  if (status === "VERIFIED" && permissions.includes("CORRECTIVE_ACTION_CLOSE")) return "À fermer";
  return { PLANNED: "Planifiée", IN_PROGRESS: "En cours", COMPLETED: "Réalisation déclarée", VERIFIED: "Vérifiée", CLOSED: "Fermée" }[status] ?? status;
}
