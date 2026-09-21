import test from "node:test";
import assert from "node:assert/strict";
import { formatDay, formatMoment, plural } from "./app/sentinelle/presentation.mjs";
import { actionsAvailable, actionStatusLabel, evidenceTypeLabel, priorityLabel, verdictLabel } from "./app/sentinelle/[buildingId]/corrective-actions/actionState.mjs";

test("pluralisation métier", () => {
  assert.equal(plural(0, "action corrective", "actions correctives"), "0 actions correctives");
  assert.equal(plural(1, "preuve", "preuves"), "1 preuve");
  assert.equal(plural(2, "constat", "constats"), "2 constats");
});

test("dates françaises lisibles", () => {
  assert.equal(formatMoment("2026-09-21T16:42:00.000Z"), "21 septembre 2026 à 12 h 42");
  assert.equal(formatDay("2026-09-25T00:00:00.000Z"), "25 septembre 2026");
  assert.equal(formatMoment("invalid"), null);
});

test("libellés et actions disponibles", () => {
  assert.equal(actionStatusLabel.COMPLETED, "Réalisation déclarée");
  assert.equal(priorityLabel.WARNING, "À surveiller");
  assert.equal(evidenceTypeLabel.SYSTEM_REFERENCE, "Référence CORO");
  assert.equal(verdictLabel.REJECTED, "Rejetée");
  assert.equal(actionsAvailable("COMPLETED", ["CORRECTIVE_ACTION_VERIFY"], true).verify, false);
  assert.equal(actionsAvailable("COMPLETED", ["CORRECTIVE_ACTION_VERIFY"], false).verify, true);
});
