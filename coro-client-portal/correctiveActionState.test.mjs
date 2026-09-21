import assert from "node:assert/strict";
import test from "node:test";
import { actionsAvailable, actionStatusLabel, evidenceTypeLabel, priorityLabel, verdictLabel } from "./app/sentinelle/[buildingId]/corrective-actions/actionState.mjs";

test("permissions et statut determinent les commandes", () => {
  assert.equal(actionsAvailable("PLANNED", ["CORRECTIVE_ACTION_EDIT"]).start, true);
  assert.equal(actionsAvailable("PLANNED", ["CORRECTIVE_ACTION_COMPLETE"]).start, false);
  assert.equal(actionsAvailable("IN_PROGRESS", ["CORRECTIVE_ACTION_EDIT"]).addEvidence, true);
  assert.equal(actionsAvailable("IN_PROGRESS", ["CORRECTIVE_ACTION_COMPLETE"]).complete, true);
  assert.deepEqual(actionsAvailable("IN_PROGRESS", ["CORRECTIVE_ACTION_EDIT", "CORRECTIVE_ACTION_COMPLETE"]), {
    start: false, addEvidence: true, withdrawEvidence: true, complete: true, verify: false, close: false,
  });
  assert.equal(actionsAvailable("COMPLETED", ["CORRECTIVE_ACTION_VERIFY"], true).verify, false);
  assert.equal(actionsAvailable("COMPLETED", ["CORRECTIVE_ACTION_VERIFY"], false).verify, true);
  assert.equal(actionsAvailable("VERIFIED", ["CORRECTIVE_ACTION_CLOSE"]).close, true);
  assert.ok(Object.values(actionsAvailable("CLOSED", ["CORRECTIVE_ACTION_EDIT", "CORRECTIVE_ACTION_COMPLETE", "CORRECTIVE_ACTION_VERIFY", "CORRECTIVE_ACTION_CLOSE"])).every((value) => !value));
  assert.ok(Object.values(actionsAvailable("CANCELLED", ["CORRECTIVE_ACTION_EDIT", "CORRECTIVE_ACTION_COMPLETE"])).every((value) => !value));
});

test("les libelles masquent les codes techniques", () => {
  assert.equal(actionStatusLabel.IN_PROGRESS, "En cours");
  assert.equal(actionStatusLabel.COMPLETED, "Réalisation déclarée");
  assert.equal(priorityLabel.WARNING, "À surveiller");
  assert.equal(evidenceTypeLabel.LINK, "Lien");
  assert.equal(verdictLabel.REJECTED, "Rejetée");
});
