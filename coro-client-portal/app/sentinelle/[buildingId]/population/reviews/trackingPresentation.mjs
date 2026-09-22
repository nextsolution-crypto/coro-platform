export const trackingEndpoint = (reviewId) => `/client-portal/operational-reviews/${encodeURIComponent(reviewId)}/corrective-action-reports`;

export function parseTrackingList(value) {
  if (!Array.isArray(value)) throw new Error("Contrat de suivi invalide");
  return sortTrackingReports(value.map((item) => {
    if (!item || !Number.isSafeInteger(item.reportVersion) || item.reportVersion < 1 ||
        !["SNAPSHOT_READY", "GENERATING", "FINALIZED"].includes(item.status) ||
        !Number.isSafeInteger(item.actionCount) || item.actionCount < 0 ||
        Number.isNaN(Date.parse(item.snapshotAt)) ||
        !["FR", "EN"].includes(item.language) || item.format !== "PDF") throw new Error("Contrat de suivi invalide");
    if (item.status === "FINALIZED" && (!Number.isSafeInteger(item.fileSize) || item.fileSize < 1 || !/^[a-f0-9]{64}$/i.test(item.reportSha256 ?? "") || Number.isNaN(Date.parse(item.generatedAt)))) throw new Error("Contrat de suivi invalide");
    return item;
  }));
}

export function sortTrackingReports(reports) {
  return [...reports].sort((a, b) => b.reportVersion - a.reportVersion);
}

export function deriveTrackingView(reports) {
  const sorted = sortTrackingReports(reports);
  return { latest: sorted[0] ?? null, latestFinalized: sorted.find((item) => item.status === "FINALIZED") ?? null, history: sorted.slice(1) };
}

export function trackingStatusLabel(status) {
  return ({ SNAPSHOT_READY: "Situation enregistrée — rapport non généré", GENERATING: "Génération en cours", FINALIZED: "Rapport disponible" })[status] ?? "État inconnu";
}

export const trackingVersion = (version) => `État R${version}`;
export const trackingActionCount = (count) => `${count} action${count === 1 ? "" : "s"}`;
export function trackingFilename(reference, version, language = "FR") {
  const safeReference = /^REX-\d{4}-\d{6}$/.test(reference) ? reference : "REX";
  const safeVersion = Number.isSafeInteger(version) && version > 0 ? version : 1;
  return `${safeReference}_Suivi-actions_R${safeVersion}_${language === "EN" ? "EN" : "FR"}.pdf`;
}
export function trackingFileSize(bytes) {
  if (!Number.isSafeInteger(bytes) || bytes < 0) return "Non disponible";
  if (bytes < 1024) return `${bytes} octets`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}
