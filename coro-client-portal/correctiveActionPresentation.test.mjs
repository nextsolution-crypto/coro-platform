import assert from "node:assert/strict";
import test from "node:test";
import { actionAttention, reviewAccessFromResponse } from "./app/sentinelle/[buildingId]/population/evidence/correctiveActionPresentation.mjs";

test("REX forbidden differs from absent without exposing a source", () => {
  assert.equal(reviewAccessFromResponse(403, false), "restricted");
  assert.equal(reviewAccessFromResponse(404, false), "missing");
  assert.equal(reviewAccessFromResponse(200, true), "available");
});

test("attention follows status and explicit permissions", () => {
  assert.equal(actionAttention("COMPLETED", ["CORRECTIVE_ACTION_VERIFY"]), "À vérifier");
  assert.equal(actionAttention("COMPLETED", ["CORRECTIVE_ACTION_VERIFY"], true), "Réalisation déclarée");
  assert.equal(actionAttention("COMPLETED", []), "Réalisation déclarée");
  assert.equal(actionAttention("VERIFIED", ["CORRECTIVE_ACTION_CLOSE"]), "À fermer");
  assert.equal(actionAttention("VERIFIED", []), "Vérifiée");
  assert.equal(actionAttention("IN_PROGRESS", []), "En cours");
  assert.equal(actionAttention("CLOSED", []), "Fermée");
});
