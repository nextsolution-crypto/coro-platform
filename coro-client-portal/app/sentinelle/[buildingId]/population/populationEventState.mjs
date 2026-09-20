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

export function getPopulationAlertWorkflowStage(alert) {
  const state = derivePopulationWorkflowState({ alert });
  const legacyNames = {
    EDIT: "DRAFT",
    APPROVAL_REQUIRED: "READY_FOR_APPROVAL",
    FREEZE_REQUIRED: "APPROVED_NEEDS_FREEZE",
    SEND_READY: "RECIPIENTS_FROZEN",
    WAIT: "SENDING",
    PROVIDER_ACCEPTED: "ACTIVE",
    DELIVERED: "ACTIVE",
  };
  return legacyNames[state] ?? state;
}

/** @param {{ event?: any, alert?: any }} serverState */
export function derivePopulationWorkflowState({ event = null, alert = null }) {
  if (event?.status === "ENDED" || event?.status === "CANCELLED") {
    return "READ_ONLY_HISTORY";
  }
  if (!alert || typeof alert !== "object") return "NONE";
  if (alert.status === "DRAFT") return "EDIT";
  if (alert.status === "READY") {
    if (!alert.approvedAt) return "APPROVAL_REQUIRED";
    if (!alert.recipientsFrozenAt || !alert.deliveryModeSnapshot) {
      return "FREEZE_REQUIRED";
    }
    const counts = alert.deliveryCounts ?? {};
    const materialized = Object.values(counts).reduce(
      (sum, value) => sum + (Number(value) || 0),
      0,
    );
    return materialized > 0 ? "SEND_READY" : "FREEZE_REQUIRED";
  }
  if (alert.status === "SENDING") return "WAIT";
  if (alert.status === "ACTIVE") {
    const counts = alert.deliveryCounts ?? {};
    if (derivePopulationCloseState({ ...event, alerts: [alert] }, true).eligible) {
      return "EVENT_CLOSE_REQUIRED";
    }
    if ((counts.DELIVERED ?? 0) > 0) return "DELIVERED";
    if ((counts.SENT ?? 0) > 0) return "PROVIDER_ACCEPTED";
    return "WAIT";
  }
  if (alert.status === "FAILED") return "FAILED";
  return alert.status || "NONE";
}

export function getPopulationDeliveryModeLabel(mode) {
  if (mode === "LIVE") return "DIFFUSION RÉELLE";
  if (mode === "SANDBOX") return "SIMULATION";
  return "MODE NON FIGÉ";
}

export function getPopulationResumeAction(event, alert) {
  if (!event || event.status !== "ACTIVE" || !alert) return null;
  const state = derivePopulationWorkflowState({ event, alert });
  const permissionByState = {
    EDIT: "POPULATION_PREPARE",
    APPROVAL_REQUIRED: "POPULATION_APPROVE",
    FREEZE_REQUIRED: "POPULATION_PREPARE",
    SEND_READY: "POPULATION_SEND",
  };
  const permission = permissionByState[state];
  if (!permission) return null;
  const subject =
    alert.type === "ALL_CLEAR"
      ? "LA FIN D’ALERTE"
      : alert.type === "UPDATE"
        ? "LA MISE À JOUR"
        : "L’ALERTE INITIALE";
  const detailByState = {
    EDIT: "Édition à terminer",
    APPROVAL_REQUIRED: "Approbation requise",
    FREEZE_REQUIRED: "Roster à figer",
    SEND_READY: "Diffusion à confirmer",
  };
  return {
    state,
    permission,
    title: `REPRENDRE ${subject}`,
    detail: detailByState[state],
  };
}

export function buildPopulationResumePlan(event, alert, scenarios, preview) {
  const scenario = (Array.isArray(scenarios) ? scenarios : []).find(
    (candidate) => candidate?.id === event?.emergencyScenarioId,
  );
  if (!scenario || !preview) return null;
  return {
    alertId: alert.id,
    scenarioId: scenario.id,
    preview,
    composerOpen: true,
    step: 6,
    workflowState: derivePopulationWorkflowState({ event, alert }),
  };
}

export function canCompletePopulationResumeMount(state) {
  return Boolean(
    state?.pendingAlertId &&
    state?.composerOpen &&
    state?.scenarioReady &&
    state?.previewReady &&
    state?.createdAlertId === state?.pendingAlertId &&
    state?.targetMounted,
  );
}

export function derivePopulationCloseState(event, canPrepare) {
  const allClear = [...(event?.alerts ?? [])]
    .reverse()
    .find(
      (alert) => alert.type === "ALL_CLEAR" && alert.status !== "CANCELLED",
    );
  const counts = allClear?.deliveryCounts ?? {};
  const queued = Number(counts.QUEUED ?? 0);
  const sending = Number(counts.SENDING ?? 0);
  const sent = Number(counts.SENT ?? 0);
  const delivered = Number(counts.DELIVERED ?? 0);
  const reconciliation = Number(
    allClear?.reconciliationRequiredCount ?? counts.RECONCILIATION_REQUIRED ?? 0,
  );
  const failed = Number(counts.FAILED ?? 0);
  const suppressed = Number(counts.SUPPRESSED ?? 0);
  const cancelled = Number(counts.CANCELLED ?? 0);
  const eventActive = event?.status === "ACTIVE";
  const allClearPublished = Boolean(
    allClear && ["ACTIVE", "ENDED"].includes(allClear.status),
  );
  const transportComplete = queued === 0 && sending === 0 && reconciliation === 0;
  const hasConfirmedDelivery = sent + delivered > 0;
  const eligible = Boolean(
    eventActive &&
    allClearPublished &&
    transportComplete &&
    hasConfirmedDelivery,
  );

  return {
    allClear,
    visible: Boolean(eventActive && allClear),
    eligible,
    permitted: Boolean(canPrepare),
    enabled: eligible && Boolean(canPrepare),
    incomplete: failed + suppressed + cancelled > 0,
    summary: {
      communications: Array.isArray(event?.alerts) ? event.alerts.length : 0,
      delivered: (event?.alerts ?? []).reduce(
        (total, alert) => total + Number(alert.deliveryCounts?.DELIVERED ?? 0),
        0,
      ),
      failed: (event?.alerts ?? []).reduce(
        (total, alert) => total + Number(alert.deliveryCounts?.FAILED ?? 0),
        0,
      ),
      reconciliation,
    },
  };
}

export function openPopulationCloseConfirmation(closeState, onOpen) {
  if (!closeState?.enabled) return false;
  onOpen();
  return true;
}

export function confirmPopulationEventClose(closeState, loading, onConfirm) {
  if (!closeState?.enabled || loading) return false;
  onConfirm();
  return true;
}

export function derivePopulationEventPresentation({
  activeEvent,
  lastClosedEvent,
  initialLoading,
}) {
  if (activeEvent) return "EVENT_ACTIVE";
  if (lastClosedEvent) return "EVENT_ENDED";
  if (initialLoading) return "INITIAL_LOADING";
  return "EMPTY";
}

export function isPopulationConcurrencyConflict(error) {
  return Boolean(error && typeof error === "object" && error.status === 409);
}
