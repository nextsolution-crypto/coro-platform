export function visibleReviewActions(permissions) {
  const allowed = new Set(permissions);
  return [
    ...(allowed.has("INCIDENT_REPORT_REVIEW")
      ? ["REVIEWED", "CORRECTION_REQUESTED"]
      : []),
    ...(allowed.has("INCIDENT_REPORT_APPROVE") ? ["APPROVED"] : []),
  ];
}

export const reviewActionPresentation = Object.freeze({
  REVIEWED: Object.freeze({
    label: "Réviser",
    success: "Révision enregistrée.",
  }),
  CORRECTION_REQUESTED: Object.freeze({
    label: "Demander correction",
    success: "Corrections demandées.",
  }),
  APPROVED: Object.freeze({ label: "Approuver", success: "Rapport approuvé." }),
});
