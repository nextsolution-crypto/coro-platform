export function formatReportSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "Non disponible";
  if (bytes < 1024) return `${bytes} ${bytes <= 1 ? "octet" : "octets"}`;
  const unit = bytes < 1024 * 1024 ? "Ko" : "Mo";
  const value = bytes < 1024 * 1024 ? bytes / 1024 : bytes / (1024 * 1024);
  return `${new Intl.NumberFormat("fr-CA", { maximumFractionDigits: 1 }).format(value)} ${unit}`;
}

export function formatReportLanguage(language) {
  return language === "FR" ? "Français" : language === "EN" ? "Anglais" : "Non renseignée";
}

export function buildReportFilename(reference, reviewVersion) {
  const safeReference = /^REX-\d{4}-\d{6}$/.test(reference) ? reference : "REX";
  const safeVersion = Number.isInteger(reviewVersion) && reviewVersion > 0 ? reviewVersion : 1;
  return `${safeReference}_v${safeVersion}_FR.pdf`;
}

export function reportStatusLabel(status) {
  return status === "GENERATING" ? "Génération en cours" : status === "FINALIZED" ? "Rapport disponible" : "Aucun rapport généré";
}

export function normalizeReportResponse(value) {
  return value === "" || value == null ? null : value;
}

export function canStartReportGeneration(canGenerate, report, pending) {
  return canGenerate && !pending && report === null;
}

export function reportEndpoint(reviewId) {
  return `/client-portal/operational-reviews/${encodeURIComponent(reviewId)}/report`;
}
