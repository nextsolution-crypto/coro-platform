import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeOperationalEvent,
  selectLegacyActiveAlerts,
} from "./app/sentinelle/[buildingId]/population/populationEventState.mjs";

test("supporte aucun event et selectionne la communication legacy ACTIVE", () => {
  assert.equal(normalizeOperationalEvent(null), null);
  assert.deepEqual(
    selectLegacyActiveAlerts([
      { id: "legacy-1", status: "ACTIVE", operationalEventId: null },
    ]).map((alert) => alert.id),
    ["legacy-1"],
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
  assert.deepEqual(selectLegacyActiveAlerts(undefined), []);
  assert.deepEqual(
    selectLegacyActiveAlerts([
      { id: "ended", status: "ENDED", operationalEventId: null },
      { id: "event-alert", status: "ACTIVE", operationalEventId: "event-1" },
    ]),
    [],
  );
});
