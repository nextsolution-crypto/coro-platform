import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeOperationalEvent,
  normalizeLegacyActiveAlerts,
  mergePopulationRegistry,
  getPopulationAlertWorkflowStage,
  getPopulationDeliveryModeLabel,
  derivePopulationWorkflowState,
} from "./app/sentinelle/[buildingId]/population/populationEventState.mjs";

test("supporte aucun event et selectionne la communication legacy ACTIVE", () => {
  assert.equal(normalizeOperationalEvent(null), null);
  assert.deepEqual(
    normalizeLegacyActiveAlerts([
      { id: "legacy-1", status: "ACTIVE", operationalEventId: null },
    ]).map((alert) => alert.id),
    ["legacy-1"],
  );
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
