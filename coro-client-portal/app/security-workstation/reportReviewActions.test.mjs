import assert from "node:assert/strict";
import test from "node:test";
import {
  reviewActionPresentation,
  visibleReviewActions,
} from "./reportReviewActions.mjs";

const renderedLabels = (permissions) =>
  visibleReviewActions(permissions).map(
    (action) => reviewActionPresentation[action].label,
  );

test("REVIEW seul rend Réviser et Demander correction", () => {
  assert.deepEqual(renderedLabels(["INCIDENT_REPORT_REVIEW"]), [
    "Réviser",
    "Demander correction",
  ]);
});

test("APPROVE seul rend uniquement Approuver", () => {
  assert.deepEqual(renderedLabels(["INCIDENT_REPORT_APPROVE"]), ["Approuver"]);
});

test("REVIEW et APPROVE rendent les trois actions", () => {
  assert.deepEqual(
    renderedLabels(["INCIDENT_REPORT_REVIEW", "INCIDENT_REPORT_APPROVE"]),
    ["Réviser", "Demander correction", "Approuver"],
  );
});

test("aucun droit ne rend aucune action", () => {
  assert.deepEqual(renderedLabels([]), []);
});
