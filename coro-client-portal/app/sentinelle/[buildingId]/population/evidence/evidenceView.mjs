export const FORBIDDEN_EVIDENCE_KEYS = [
  "subscriberId", "destination", "email", "phone", "latitude", "longitude",
  "providerMessageId", "providerIdempotencyKey", "clientIntentId",
  "providerCallStartedAt", "lease", "payload",
];

export function formatEvidenceUtc(value) {
  if (!value) return "Non enregistre";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Non enregistre";
  return `${new Intl.DateTimeFormat("fr-CA", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit",
    minute: "2-digit", second: "2-digit", hour12: false, timeZone: "UTC",
  }).format(date)} UTC`;
}

export function evidenceExceptions(snapshot) {
  const summary = snapshot?.summary ?? {};
  const exceptions = [];
  if (!snapshot?.communications?.some((item) => item.type === "ALL_CLEAR")) exceptions.push("Aucune fin d'alerte enregistree");
  for (const [key, label] of [["failed", "Echecs"], ["suppressed", "Suppressions"], ["outcomeUnknown", "Resultats ambigus"], ["retryPending", "Reprises en attente"]]) {
    if (Number(summary[key] ?? 0) > 0) exceptions.push(`${label} : ${summary[key]}`);
  }
  if (snapshot?.closure?.closeReason) exceptions.push(`Motif de cloture : ${snapshot.closure.closeReason}`);
  return exceptions;
}

export function findForbiddenEvidencePaths(value, path = "$") {
  if (!value || typeof value !== "object") return [];
  const found = [];
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (FORBIDDEN_EVIDENCE_KEYS.some((item) => key.toLowerCase() === item.toLowerCase())) found.push(childPath);
    found.push(...findForbiddenEvidencePaths(child, childPath));
  }
  return found;
}

export function communicationLabel(type, sequence) {
  if (type === "ALL_CLEAR") return "FIN D'ALERTE";
  if (type === "UPDATE") return "MISE A JOUR";
  if (type === "TEST") return sequence === 1 ? "TEST INITIAL" : "TEST";
  return "ALERTE INITIALE";
}

export function deriveEvidenceUiState(record, manifest, verification) {
  if (!record) return "EVIDENCE_MISSING";
  if (!manifest) return "MANIFEST_MISSING";
  if (!verification) return "VERIFY_REQUIRED";
  return verification.status;
}
