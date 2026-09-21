import test from "node:test";
import assert from "node:assert/strict";
import { buildReportFilename, formatReportLanguage, formatReportSize, reportStatusLabel } from "./app/sentinelle/[buildingId]/population/reviews/reportPresentation.mjs";

test("taille du rapport lisible", () => {
  assert.equal(formatReportSize(0), "0 octet");
  assert.equal(formatReportSize(1), "1 octet");
  assert.equal(formatReportSize(1024), "1 Ko");
  assert.equal(formatReportSize(33710), "32,9 Ko");
  assert.equal(formatReportSize(1024 * 1024), "1 Mo");
  assert.equal(formatReportSize(-1), "Non disponible");
});

test("langue, statut et nom de fichier du rapport", () => {
  assert.equal(formatReportLanguage("FR"), "Français");
  assert.equal(reportStatusLabel("GENERATING"), "Génération en cours");
  assert.equal(reportStatusLabel("FINALIZED"), "Rapport disponible");
  assert.equal(buildReportFilename("REX-2026-000001", 1), "REX-2026-000001_v1_FR.pdf");
  assert.equal(buildReportFilename("../../unsafe", 1), "REX_v1_FR.pdf");
});
