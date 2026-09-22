import { test } from "node:test";
import { strict as assert } from "node:assert";
import { deriveTrackingView, parseTrackingList, trackingActionCount, trackingFilename, trackingFileSize, trackingStatusLabel } from "./trackingPresentation.mjs";

const report = (reportVersion, status = "FINALIZED") => ({ reportVersion, status, actionCount: 1, snapshotAt: "2026-09-22T00:00:00.000Z", generatedAt: "2026-09-22T01:00:00.000Z", fileSize: 1024, reportSha256: "a".repeat(64), language: "FR", format: "PDF" });
test("trie sans muter et conserve le dernier rapport disponible", () => {
  const input = [report(1), report(2, "GENERATING")];
  const view = deriveTrackingView(parseTrackingList(input));
  assert.equal(view.latest.reportVersion, 2);
  assert.equal(view.latestFinalized.reportVersion, 1);
  assert.equal(view.history[0].reportVersion, 1);
  assert.equal(input[0].reportVersion, 1);
});
test("accepte une liste vide mais refuse un contrat malformed", () => {
  assert.deepEqual(parseTrackingList([]), []);
  for (const value of [null, "", {}, [report(0)], [report(1, "UNKNOWN")], [{ ...report(1), reportSha256: "bad" }]]) assert.throws(() => parseTrackingList(value));
});
test("humanise états, compte, taille et nom sûr", () => {
  assert.equal(trackingStatusLabel("SNAPSHOT_READY"), "Situation enregistrée — rapport non généré");
  assert.equal(trackingActionCount(0), "0 actions");
  assert.equal(trackingActionCount(1), "1 action");
  assert.equal(trackingFileSize(1024), "1.0 Ko");
  assert.equal(trackingFilename("REX-2026-000001", 12), "REX-2026-000001_Suivi-actions_R12_FR.pdf");
  assert.equal(trackingFilename("../../unsafe", 1), "REX_Suivi-actions_R1_FR.pdf");
});
test("distingue les états incomplets et les anciens rapports", () => {
  const ready = { ...report(3, "SNAPSHOT_READY"), generatedAt: null, fileSize: null, reportSha256: null };
  const view = deriveTrackingView(parseTrackingList([report(1), ready, report(2)]));
  assert.equal(view.latest.reportVersion, 3);
  assert.equal(view.latestFinalized.reportVersion, 2);
  assert.deepEqual(view.history.map((item) => item.reportVersion), [2, 1]);
  assert.equal(trackingStatusLabel("GENERATING"), "Génération en cours");
  assert.equal(trackingStatusLabel("FINALIZED"), "Rapport disponible");
});
test("refuse les métadonnées finales invalides", () => {
  for (const value of [{ ...report(1), fileSize: -1 }, { ...report(1), generatedAt: null }, { ...report(1), actionCount: -1 }, { ...report(1), format: "DOCX" }]) assert.throws(() => parseTrackingList([value]));
});
