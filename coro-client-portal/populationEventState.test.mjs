import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeOperationalEvent,
  normalizeLegacyActiveAlerts,
  mergePopulationRegistry,
  getPopulationAlertWorkflowStage,
  getPopulationDeliveryModeLabel,
  derivePopulationWorkflowState,
  getPopulationResumeAction,
  buildPopulationResumePlan,
  canCompletePopulationResumeMount,
  derivePopulationCloseState,
  openPopulationCloseConfirmation,
  confirmPopulationEventClose,
  derivePopulationEventPresentation,
  isPopulationConcurrencyConflict,
} from "./app/sentinelle/[buildingId]/population/populationEventState.mjs";

const closeEvent = (overrides = {}) => ({
  id: "event-1",
  status: "ACTIVE",
  alerts: [
    {
      id: "alert-1",
      type: "ALL_CLEAR",
      status: "ACTIVE",
      deliveryCounts: { DELIVERED: 1 },
    },
  ],
  ...overrides,
});

test("active la cloture depuis un ALL_CLEAR livre et le snapshot serveur seul", () => {
  const event = closeEvent();
  const state = derivePopulationCloseState(event, true);

  assert.equal(state.enabled, true);
  assert.equal(
    derivePopulationWorkflowState({ event, alert: event.alerts[0] }),
    "EVENT_CLOSE_REQUIRED",
  );
});

test("le premier clic ouvre une seule confirmation sans confirmer", () => {
  const state = derivePopulationCloseState(closeEvent(), true);
  let opened = 0;
  let confirmed = 0;

  assert.equal(
    openPopulationCloseConfirmation(state, () => {
      opened += 1;
    }),
    true,
  );
  assert.equal(opened, 1);
  assert.equal(confirmed, 0);

  assert.equal(
    confirmPopulationEventClose(state, false, () => {
      confirmed += 1;
    }),
    true,
  );
  assert.equal(confirmed, 1);
});

test("le chargement bloque une seconde confirmation", () => {
  const state = derivePopulationCloseState(closeEvent(), true);
  let confirmed = 0;
  assert.equal(
    confirmPopulationEventClose(state, true, () => {
      confirmed += 1;
    }),
    false,
  );
  assert.equal(confirmed, 0);
});

test("refuse la cloture READY, SENDING, sans permission ou apres cloture", () => {
  const ready = closeEvent({
    alerts: [
      {
        type: "ALL_CLEAR",
        status: "READY",
        deliveryCounts: { DELIVERED: 1 },
      },
    ],
  });
  const sending = closeEvent({
    alerts: [
      {
        type: "ALL_CLEAR",
        status: "ACTIVE",
        deliveryCounts: { DELIVERED: 1, SENDING: 1 },
      },
    ],
  });

  assert.equal(derivePopulationCloseState(ready, true).enabled, false);
  assert.equal(derivePopulationCloseState(sending, true).enabled, false);
  assert.equal(derivePopulationCloseState(closeEvent(), false).enabled, false);
  assert.equal(
    derivePopulationCloseState(closeEvent({ status: "ENDED" }), true).visible,
    false,
  );
});

test("conserve l'evenement termine pendant les refresh de fond successifs", () => {
  const lastClosedEvent = { id: "closed-1", status: "ENDED" };
  const snapshot = {
    activeEvent: null,
    lastClosedEvent,
    initialLoading: false,
    backgroundRefreshing: true,
  };

  assert.equal(derivePopulationEventPresentation(snapshot), "EVENT_ENDED");
  assert.equal(derivePopulationEventPresentation(snapshot), "EVENT_ENDED");
  assert.equal(
    derivePopulationEventPresentation({
      ...snapshot,
      backgroundRefreshing: false,
    }),
    "EVENT_ENDED",
  );
});

test("remplace atomiquement l'historique par un nouvel evenement actif", () => {
  assert.equal(
    derivePopulationEventPresentation({
      activeEvent: { id: "active-2", status: "ACTIVE" },
      lastClosedEvent: null,
      initialLoading: false,
      backgroundRefreshing: false,
    }),
    "EVENT_ACTIVE",
  );
});

test("reserve le loading au premier chargement sans etat connu", () => {
  assert.equal(
    derivePopulationEventPresentation({
      activeEvent: null,
      lastClosedEvent: null,
      initialLoading: true,
      backgroundRefreshing: false,
    }),
    "INITIAL_LOADING",
  );
  assert.equal(
    derivePopulationEventPresentation({
      activeEvent: null,
      lastClosedEvent: { id: "closed-1", status: "ENDED" },
      initialLoading: true,
      backgroundRefreshing: true,
    }),
    "EVENT_ENDED",
  );
});

test("identifie uniquement les conflits HTTP multi-operateur", () => {
  assert.equal(isPopulationConcurrencyConflict({ status: 409 }), true);
  assert.equal(isPopulationConcurrencyConflict({ status: 400 }), false);
  assert.equal(isPopulationConcurrencyConflict(new Error("conflict")), false);
});

test("supporte aucun event et selectionne la communication legacy ACTIVE", () => {
  assert.equal(normalizeOperationalEvent(null), null);
  assert.deepEqual(
    normalizeLegacyActiveAlerts([
      { id: "legacy-1", status: "ACTIVE", operationalEventId: null },
    ]).map((alert) => alert.id),
    ["legacy-1"],
  );
});

test("construit une reprise vierge avec scenario, preview et meme alerte", () => {
  const event = {
    status: "ACTIVE",
    emergencyScenarioId: "228ffa39-5e95-556b-b24f-31d782fefc93",
  };
  const alert = {
    id: "cbef6379-c69d-4031-86f2-c843f9a17e79",
    type: "ALL_CLEAR",
    status: "READY",
    approvedAt: "2026-09-20T10:00:00Z",
    recipientsFrozenAt: null,
  };
  const preview = { population: { uniqueTargetCount: 1 } };
  const plan = buildPopulationResumePlan(
    event,
    alert,
    [{ id: event.emergencyScenarioId }],
    preview,
  );
  assert.deepEqual(plan, {
    alertId: alert.id,
    scenarioId: event.emergencyScenarioId,
    preview,
    composerOpen: true,
    step: 6,
    workflowState: "FREEZE_REQUIRED",
  });
  assert.equal(buildPopulationResumePlan(event, alert, [], preview), null);
  assert.equal(
    buildPopulationResumePlan(event, alert, [{ id: event.emergencyScenarioId }], null),
    null,
  );
});

test("attend le montage reel avant de terminer le scroll de reprise", () => {
  const state = {
    pendingAlertId: "alert-1",
    composerOpen: true,
    scenarioReady: true,
    previewReady: true,
    createdAlertId: "alert-1",
    targetMounted: false,
  };
  assert.equal(canCompletePopulationResumeMount(state), false);
  assert.equal(
    canCompletePopulationResumeMount({ ...state, targetMounted: true }),
    true,
  );
});

test("propose une reprise contextuelle avec la permission de la prochaine etape", () => {
  const event = { status: "ACTIVE" };
  const cases = [
    ["DRAFT", null, null, "EDIT", "POPULATION_PREPARE"],
    ["READY", null, null, "APPROVAL_REQUIRED", "POPULATION_APPROVE"],
    [
      "READY",
      "2026-09-20T10:00:00Z",
      null,
      "FREEZE_REQUIRED",
      "POPULATION_PREPARE",
    ],
    [
      "READY",
      "2026-09-20T10:00:00Z",
      "2026-09-20T10:05:00Z",
      "SEND_READY",
      "POPULATION_SEND",
    ],
  ];
  for (const [status, approvedAt, recipientsFrozenAt, state, permission] of cases) {
    const alert = {
      id: "same-alert-id",
      type: "ALL_CLEAR",
      status,
      approvedAt,
      recipientsFrozenAt,
      deliveryModeSnapshot: recipientsFrozenAt ? "LIVE" : null,
      deliveryCounts: recipientsFrozenAt ? { QUEUED: 1 } : {},
    };
    const before = structuredClone(alert);
    const action = getPopulationResumeAction(event, alert);
    assert.equal(action.state, state);
    assert.equal(action.permission, permission);
    assert.equal(action.title, "REPRENDRE LA FIN D’ALERTE");
    assert.deepEqual(alert, before);
    assert.equal(alert.id, "same-alert-id");
  }
});

test("reconstruit tout le workflow depuis deux snapshots serveur sans etat client", () => {
  const event = { status: "ACTIVE" };
  const approvedAllClear = {
    type: "ALL_CLEAR",
    status: "READY",
    approvedAt: "2026-09-20T10:00:00Z",
    recipientsFrozenAt: null,
    deliveryModeSnapshot: null,
    deliveryCounts: {},
  };
  assert.equal(
    derivePopulationWorkflowState({ event, alert: approvedAllClear }),
    "FREEZE_REQUIRED",
  );

  const frozenReload = {
    ...approvedAllClear,
    recipientsFrozenAt: "2026-09-20T10:05:00Z",
    deliveryModeSnapshot: "LIVE",
    deliveryCounts: { QUEUED: 1 },
  };
  assert.equal(
    derivePopulationWorkflowState({ event, alert: frozenReload }),
    "SEND_READY",
  );
});

test("derive les etats transport et la cloture depuis le serveur", () => {
  assert.equal(
    derivePopulationWorkflowState({ alert: { status: "DRAFT" } }),
    "EDIT",
  );
  assert.equal(
    derivePopulationWorkflowState({
      alert: { status: "READY", approvedAt: null },
    }),
    "APPROVAL_REQUIRED",
  );
  assert.equal(
    derivePopulationWorkflowState({ alert: { status: "SENDING" } }),
    "WAIT",
  );
  assert.equal(
    derivePopulationWorkflowState({
      alert: { status: "ACTIVE", deliveryCounts: { SENT: 1 } },
    }),
    "PROVIDER_ACCEPTED",
  );
  assert.equal(
    derivePopulationWorkflowState({
      alert: { status: "ACTIVE", deliveryCounts: { DELIVERED: 1 } },
    }),
    "DELIVERED",
  );
  assert.equal(
    derivePopulationWorkflowState({
      event: { status: "ACTIVE" },
      alert: {
        type: "ALL_CLEAR",
        status: "ACTIVE",
        deliveryCounts: { DELIVERED: 1 },
      },
    }),
    "EVENT_CLOSE_REQUIRED",
  );
  assert.equal(
    derivePopulationWorkflowState({
      event: { status: "ENDED" },
      alert: { status: "ACTIVE" },
    }),
    "READ_ONLY_HISTORY",
  );
});

test("reconstruit READY approuve non fige comme freeze requis", () => {
  const alert = {
    status: "READY",
    approvedAt: "2026-09-20T10:00:00Z",
    recipientsFrozenAt: null,
    deliveryModeSnapshot: null,
  };
  assert.equal(
    getPopulationAlertWorkflowStage(alert),
    "APPROVED_NEEDS_FREEZE",
  );
  assert.equal(getPopulationAlertWorkflowStage({ ...alert }), "APPROVED_NEEDS_FREEZE");
});

test("reconstruit un roster fige LIVE comme pret au preflight", () => {
  assert.equal(
    getPopulationAlertWorkflowStage({
      status: "READY",
      approvedAt: "2026-09-20T10:00:00Z",
      recipientsFrozenAt: "2026-09-20T10:05:00Z",
      deliveryModeSnapshot: "LIVE",
      deliveryCounts: { QUEUED: 1 },
    }),
    "RECIPIENTS_FROZEN",
  );
});

test("n'invente jamais le mode historique", () => {
  assert.equal(getPopulationDeliveryModeLabel("LIVE"), "DIFFUSION RÉELLE");
  assert.equal(getPopulationDeliveryModeLabel("SANDBOX"), "SIMULATION");
  assert.equal(getPopulationDeliveryModeLabel(null), "MODE NON FIGÉ");
});

test("affiche les snapshots LIVE d'un cycle termine sans utiliser le mode courant", () => {
  const endedEvent = {
    status: "ENDED",
    alerts: ["TEST", "UPDATE", "ALL_CLEAR"].map((type, index) => ({
      id: `alert-${index + 1}`,
      type,
      deliveryModeSnapshot: "LIVE",
    })),
  };
  const currentProgramMode = "SANDBOX";

  assert.equal(currentProgramMode, "SANDBOX");
  assert.deepEqual(
    endedEvent.alerts.map((alert) =>
      getPopulationDeliveryModeLabel(alert.deliveryModeSnapshot),
    ),
    ["DIFFUSION RÉELLE", "DIFFUSION RÉELLE", "DIFFUSION RÉELLE"],
  );
});

test("fusionne events et legacy par date descendante et normalise les collections", () => {
  assert.deepEqual(mergePopulationRegistry(undefined, undefined), []);
  const result = mergePopulationRegistry(
    [{ id: "event-ended", status: "ENDED", endedAt: "2026-09-19T12:00:00Z" }],
    [
      { id: "legacy-ended", status: "ENDED", endedAt: "2026-09-20T12:00:00Z" },
      { id: "legacy-active", status: "ACTIVE", activatedAt: "2026-09-18T12:00:00Z" },
    ],
  );
  assert.deepEqual(
    result.map(({ kind, item }) => `${kind}:${item.id}`),
    [
      "LEGACY_COMMUNICATION:legacy-ended",
      "OPERATIONAL_EVENT:event-ended",
      "LEGACY_COMMUNICATION:legacy-active",
    ],
  );
});

test("borne le registre unifie a 50 elements", () => {
  const events = Array.from({ length: 55 }, (_, index) => ({
    id: `event-${index}`,
    status: index === 0 ? "ACTIVE" : "CANCELLED",
    startedAt: new Date(2026, 0, index + 1).toISOString(),
    alerts: [
      { cycleSequence: 1, type: "INITIAL" },
      { cycleSequence: 2, type: "UPDATE" },
      { cycleSequence: 3, type: "ALL_CLEAR" },
    ],
  }));
  const result = mergePopulationRegistry(events, []);
  assert.equal(result.length, 50);
  assert.deepEqual(
    result[0].item.alerts.map((alert) => alert.cycleSequence),
    [1, 2, 3],
  );
});

test("normalise alerts absent ou undefined en tableau vide", () => {
  assert.deepEqual(normalizeOperationalEvent({ id: "event-1" }).alerts, []);
  assert.deepEqual(
    normalizeOperationalEvent({ id: "event-2", alerts: undefined }).alerts,
    [],
  );
});

test("conserve les communications valides et complete leurs agregats", () => {
  const event = normalizeOperationalEvent({
    id: "event-1",
    alerts: [{ id: "alert-1" }],
  });
  assert.equal(event.communicationCount, 1);
  assert.equal(event.latestCommunication.id, "alert-1");
  assert.deepEqual(event.alerts[0].deliveryCounts, {});
  assert.equal(event.alerts[0].targeting, null);
});

test("supporte les donnees partielles et aucune legacy", () => {
  assert.equal(normalizeOperationalEvent(undefined), null);
  assert.deepEqual(normalizeLegacyActiveAlerts(undefined), []);
  assert.deepEqual(
    normalizeLegacyActiveAlerts([
      { id: "ended", status: "ENDED", operationalEventId: null },
      { id: "event-alert", status: "ACTIVE", operationalEventId: "event-1" },
    ]),
    [],
  );
});

test("conserve plusieurs communications legacy dans leur ordre backend", () => {
  const alerts = normalizeLegacyActiveAlerts([
    { id: "legacy-1", status: "ACTIVE", operationalEventId: null },
    { id: "legacy-2", status: "ACTIVE", operationalEventId: null },
  ]);
  assert.deepEqual(
    alerts.map((alert) => alert.id),
    ["legacy-1", "legacy-2"],
  );
});

test("une communication legacy reste visible avec un event actif distinct", () => {
  const event = normalizeOperationalEvent({ id: "event-1", alerts: [] });
  const legacy = normalizeLegacyActiveAlerts([
    { id: "legacy-1", status: "ACTIVE", operationalEventId: null },
  ]);
  assert.equal(event.id, "event-1");
  assert.equal(legacy.length, 1);
});

test("un refresh sans legacy retire la communication terminee", () => {
  const before = normalizeLegacyActiveAlerts([
    { id: "legacy-1", status: "ACTIVE", operationalEventId: null },
  ]);
  const after = normalizeLegacyActiveAlerts([]);
  assert.equal(before.length, 1);
  assert.deepEqual(after, []);
});
