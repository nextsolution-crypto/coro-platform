import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createInitialHistoryState,
  filterIncidentHistory,
  getHistoryError,
  reduceHistoryState,
} from "./incidentHistoryState.ts";

const incident = {
  id: "incident-1",
  status: "ACTIVE",
  type: "FIRE_ALERT",
  triggeredAt: "2026-10-24T12:00:00.000Z",
};

test("the initial state is loading and cannot be mistaken for an empty result", () => {
  const state = createInitialHistoryState(1);

  assert.equal(state.phase, "loading");
  assert.equal(state.incidents, null);
});

test("a successful non-empty response exposes the incidents", () => {
  const state = reduceHistoryState(createInitialHistoryState(1), {
    type: "success",
    requestId: 1,
    incidents: [incident],
  });

  assert.equal(state.phase, "ready");
  assert.deepEqual(state.incidents, [incident]);
});

test("a successful empty response remains a genuine empty result", () => {
  const state = reduceHistoryState(createInitialHistoryState(1), {
    type: "success",
    requestId: 1,
    incidents: [],
  });

  assert.equal(state.phase, "ready");
  assert.deepEqual(state.incidents, []);
});

test("a filter with no match remains distinct from an empty building history", () => {
  const incidents = [incident];

  assert.deepEqual(filterIncidentHistory(incidents, "RESOLVED"), []);
  assert.equal(incidents.length, 1);
});

test("a forbidden response is distinct from a technical failure", () => {
  assert.deepEqual(getHistoryError({ status: 403 }), {
    kind: "forbidden",
    message: "Vous n’avez pas l’autorisation de consulter cet historique.",
  });
  assert.deepEqual(getHistoryError(new Error("network")), {
    kind: "technical",
    message: "Impossible de charger l’historique des incidents.",
  });
});

test("an expired session is never represented as an empty result", () => {
  assert.deepEqual(getHistoryError({ status: 401 }), {
    kind: "session",
    message: "Votre session a expiré. Reconnectez-vous.",
  });
});

test("retry starts a new request and clears the previous error", () => {
  const failed = reduceHistoryState(createInitialHistoryState(1), {
    type: "failure",
    requestId: 1,
    error: getHistoryError(new Error("network")),
  });
  const retrying = reduceHistoryState(failed, {
    type: "start",
    requestId: 2,
    preserveData: true,
  });

  assert.equal(retrying.phase, "loading");
  assert.equal(retrying.error, null);
  assert.equal(retrying.requestId, 2);
});

test("a late response from another building cannot replace current data", () => {
  const current = createInitialHistoryState(2);
  const late = reduceHistoryState(current, {
    type: "success",
    requestId: 1,
    incidents: [incident],
  });

  assert.equal(late, current);
  assert.equal(late.incidents, null);
});

test("a refresh failure keeps prior data but marks it stale", () => {
  const loaded = reduceHistoryState(createInitialHistoryState(1), {
    type: "success",
    requestId: 1,
    incidents: [incident],
  });
  const refreshing = reduceHistoryState(loaded, {
    type: "start",
    requestId: 2,
    preserveData: true,
  });
  const failed = reduceHistoryState(refreshing, {
    type: "failure",
    requestId: 2,
    error: getHistoryError(new Error("network")),
  });

  assert.equal(failed.phase, "error");
  assert.deepEqual(failed.incidents, [incident]);
  assert.equal(failed.stale, true);
});

test("the page exposes explicit recovery and distinct empty messages", () => {
  const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
  const stateSource = readFileSync(
    new URL("./incidentHistoryState.ts", import.meta.url),
    "utf8",
  );

  assert.match(stateSource, /Impossible de charger l’historique des incidents/);
  assert.match(source, />\s*Réessayer\s*</);
  assert.match(source, /Aucun incident enregistré pour ce bâtiment/);
  assert.match(source, /Aucun incident ne correspond à ce filtre/);
});

test("the register names and routes both histories without ambiguity", () => {
  const source = readFileSync(new URL("../page.tsx", import.meta.url), "utf8");

  assert.match(source, /sentinelle\/\$\{buildingId\}\/historique[\s\S]*Historique des présences/);
  assert.match(source, /sentinelle\/\$\{buildingId\}\/incidents[\s\S]*Historique des incidents/);
});
