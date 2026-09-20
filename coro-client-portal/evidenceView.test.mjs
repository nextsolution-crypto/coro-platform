import assert from "node:assert/strict";
import test from "node:test";
import { deriveEvidenceUiState, evidenceExceptions, findForbiddenEvidencePaths, formatEvidenceUtc } from "./app/sentinelle/[buildingId]/population/evidence/evidenceView.mjs";

test("affiche les dates du dossier explicitement en UTC", () => {
  assert.match(formatEvidenceUtc("2026-09-20T14:54:29.000Z"), /2026.*14.*54.*29.*UTC/);
});

test("rend visibles les exceptions de completion", () => {
  const result = evidenceExceptions({ communications: [{ type: "EMERGENCY" }], summary: { failed: 1, suppressed: 2, outcomeUnknown: 1, retryPending: 1 }, closure: { closeReason: "Cloture forcee" } });
  assert.equal(result.length, 6);
});

test("detecte recursivement les champs citoyens et techniques interdits", () => {
  assert.deepEqual(findForbiddenEvidencePaths({ program: { emailEnabled: true }, summary: { delivered: 3 }, zones: [{ geometry: { present: true } }] }), []);
  assert.deepEqual(findForbiddenEvidencePaths({ nested: { subscriberId: "x" } }), ["$.nested.subscriberId"]);
});

test("derive tous les etats serveur du dossier sans etat client anterieur", () => {
  assert.equal(deriveEvidenceUiState(null, null, null), "EVIDENCE_MISSING");
  assert.equal(deriveEvidenceUiState({ id: "e1" }, null, null), "MANIFEST_MISSING");
  assert.equal(deriveEvidenceUiState({ id: "e1" }, { id: "m1" }, null), "VERIFY_REQUIRED");
  for (const status of ["VERIFIED", "MISMATCH", "UNAVAILABLE"]) {
    assert.equal(deriveEvidenceUiState({ id: "e1" }, { id: "m1" }, { status }), status);
  }
});

test("le contrat d'affichage ne contient ni PII citoyenne ni donnees provider interdites", () => {
  const snapshot = {
    program: { emailEnabled: true, smsEnabled: false },
    communications: [{
      targeting: { uniqueTargetCount: 2 },
      deliverySummary: { delivered: 3 },
      providerSummary: { counts: { DELIVERED: 3 } },
      zones: [{ code: "A", geometry: { present: true, sha256: "abc" } }],
    }],
  };
  assert.deepEqual(findForbiddenEvidencePaths(snapshot), []);
});
