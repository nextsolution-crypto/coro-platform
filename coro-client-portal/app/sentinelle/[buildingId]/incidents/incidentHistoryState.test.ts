import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createInitialHistoryState, getHistoryError, parseIncidentHistory, reduceHistoryState } from "./incidentHistoryState.ts";

const result = {
  items: [{ id: "incident-1", status: "ACTIVE", type: "FIRE_ALERT", triggeredAt: "2026-10-24T12:00:00.000Z", isExercise: false, hasRex: false, coordinatorStepsTotal: 2, coordinatorStepsCompleted: 1 }],
  pagination: { page: 1, pageSize: 25, total: 62, totalPages: 3 },
  counts: { all: 62, open: 40, byStatus: { ACTIVE: 40, RESOLVED: 22 }, exercises: 12, real: 50 },
};

test("loading, empty and filtered-empty results remain distinguishable", () => {
  assert.equal(createInitialHistoryState(1).result, null);
  const empty = reduceHistoryState(createInitialHistoryState(1), { type: "success", requestId: 1, result: { ...result, items: [], pagination: { ...result.pagination, total: 0, totalPages: 0 }, counts: { ...result.counts, all: 0 } } });
  assert.equal(empty.phase, "ready");
  assert.equal(empty.result?.counts.all, 0);
  const filteredEmpty = reduceHistoryState(createInitialHistoryState(1), { type: "success", requestId: 1, result: { ...result, items: [], pagination: { ...result.pagination, total: 0, totalPages: 0 } } });
  assert.equal(filteredEmpty.result?.counts.all, 62);
  assert.equal(filteredEmpty.result?.pagination.total, 0);
});

test("the paginated response parser rejects the legacy array contract", () => {
  assert.throws(() => parseIncidentHistory(result.items));
  assert.deepEqual(parseIncidentHistory(result), result);
});

test("forbidden, expired and technical errors stay distinct", () => {
  assert.equal(getHistoryError({ status: 403 }).kind, "forbidden");
  assert.equal(getHistoryError({ status: 401 }).kind, "session");
  assert.equal(getHistoryError(new Error("network")).kind, "technical");
});

test("retry preserves results while clearing errors", () => {
  const loaded = reduceHistoryState(createInitialHistoryState(1), { type: "success", requestId: 1, result });
  const refreshing = reduceHistoryState(loaded, { type: "start", requestId: 2, preserveData: true });
  const failed = reduceHistoryState(refreshing, { type: "failure", requestId: 2, error: getHistoryError(new Error("network")) });
  assert.equal(failed.stale, true);
  assert.equal(failed.result?.pagination.total, 62);
  const retry = reduceHistoryState(failed, { type: "start", requestId: 3, preserveData: true });
  assert.equal(retry.error, null);
});

test("late responses cannot overwrite the newest search, filter or page", () => {
  const current = { ...createInitialHistoryState(2), result };
  const late = reduceHistoryState(current, { type: "success", requestId: 1, result: { ...result, pagination: { ...result.pagination, page: 1 } } });
  assert.equal(late, current);
});

test("the page exposes pagination, search, explicit statuses and exercise markers", () => {
  const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
  assert.match(source, /Page précédente/);
  assert.match(source, /Recherche type ou procédure/);
  assert.match(source, /PRE_ALERT:[\s\S]*Préalerte/);
  assert.match(source, /CANCELLED:[\s\S]*Annulé/);
  assert.match(source, /Statut inconnu/);
  assert.match(source, /Incident réel/);
  assert.match(source, /Exercice/);
  assert.match(source, /Réessayer/);
});

test("the register names and routes both histories without ambiguity", () => {
  const source = readFileSync(new URL("../page.tsx", import.meta.url), "utf8");
  assert.match(source, /sentinelle\/\$\{buildingId\}\/historique[\s\S]*Historique des présences/);
  assert.match(source, /sentinelle\/\$\{buildingId\}\/incidents[\s\S]*Historique des incidents/);
});

test("the population register identifies its page as a recent subset", () => {
  const source = readFileSync(new URL("../population/page.tsx", import.meta.url), "utf8");
  assert.match(source, /page=1&pageSize=25&sortBy=triggeredAt&sortOrder=desc/);
  assert.match(source, /incidents récents sur/);
  assert.match(source, /Voir l’historique complet/);
  assert.match(source, /sentinelle\/\$\{buildingId\}\/incidents/);
});
