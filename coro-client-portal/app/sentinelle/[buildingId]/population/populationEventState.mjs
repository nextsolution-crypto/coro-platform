export function normalizeOperationalEvent(value) {
  if (!value || typeof value !== "object" || typeof value.id !== "string") {
    return null;
  }

  const alerts = Array.isArray(value.alerts)
    ? value.alerts.filter((alert) => alert && typeof alert === "object")
    : [];
  const normalizedAlerts = alerts.map((alert) => ({
    ...alert,
    deliveryCounts:
      alert.deliveryCounts && typeof alert.deliveryCounts === "object"
        ? alert.deliveryCounts
        : {},
    targeting:
      alert.targeting && typeof alert.targeting === "object"
        ? alert.targeting
        : null,
  }));

  return {
    ...value,
    alerts: normalizedAlerts,
    communicationCount:
      typeof value.communicationCount === "number"
        ? value.communicationCount
        : normalizedAlerts.length,
    latestCommunication:
      value.latestCommunication &&
      typeof value.latestCommunication === "object"
        ? value.latestCommunication
        : (normalizedAlerts.at(-1) ?? null),
  };
}

export function normalizeLegacyActiveAlerts(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (alert) =>
      alert &&
      typeof alert === "object" &&
      alert.status === "ACTIVE" &&
      alert.operationalEventId == null,
  );
}

export const selectLegacyActiveAlerts = normalizeLegacyActiveAlerts;

export function mergePopulationRegistry(events, legacy) {
  const eventItems = (Array.isArray(events) ? events : []).map((item) => ({
    kind: "OPERATIONAL_EVENT",
    item,
    sortDate: item.endedAt || item.startedAt || item.createdAt || "",
  }));
  const legacyItems = (Array.isArray(legacy) ? legacy : []).map((item) => ({
    kind: "LEGACY_COMMUNICATION",
    item,
    sortDate: item.endedAt || item.activatedAt || item.createdAt || "",
  }));
  return [...eventItems, ...legacyItems]
    .sort(
      (a, b) =>
        new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime() ||
        String(b.item.id).localeCompare(String(a.item.id)),
    )
    .slice(0, 50);
}
