import test from "node:test";
import assert from "node:assert/strict";
import { buildReportFilename, canStartReportGeneration, formatReportLanguage, formatReportSize, normalizeReportResponse, reportEndpoint, reportStatusLabel } from "./app/sentinelle/[buildingId]/population/reviews/reportPresentation.mjs";

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
  assert.equal(buildReportFilename("REX-2026-000001", 1), "REX-2026-000001_v1_R1_FR.pdf");
  assert.equal(buildReportFilename("REX-2026-000001", 1, 2), "REX-2026-000001_v1_R2_FR.pdf");
  assert.equal(buildReportFilename("../../unsafe", 1), "REX_v1_R1_FR.pdf");
});

test("réponse Nest vide signifie aucun rapport et autorise un seul POST explicite", () => {
  assert.equal(normalizeReportResponse(""), null);
  assert.equal(normalizeReportResponse(null), null);
  assert.equal(canStartReportGeneration(true, normalizeReportResponse(""), false), true);
  assert.equal(canStartReportGeneration(true, null, true), false);
  assert.equal(canStartReportGeneration(false, null, false), false);
  assert.equal(canStartReportGeneration(true, { status: "GENERATING" }, false), false);
  assert.equal(canStartReportGeneration(true, { status: "FINALIZED" }, false), false);
  assert.equal(reportEndpoint("review-123"), "/client-portal/operational-reviews/review-123/report");
});
