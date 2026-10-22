#!/usr/bin/env node
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveExerciseRexRuntime } from "./exercise-rex-runtime.mjs";
import { loadSecretStore } from "./secret-store.mjs";
import { startMfaCaptureAdapter } from "./mfa-capture-adapter.mjs";
import { QaIdentityLab } from "./browser-orchestration.mjs";
import { runExerciseRexBrowser } from "./exercise-rex-browser-campaign.mjs";

const runtime = resolveExerciseRexRuntime();
const secrets = await loadSecretStore();
const adapter = await startMfaCaptureAdapter({ captureDirectory: runtime.mfaDirectory, channelToken: secrets.mfaChannelToken });
const lab = new QaIdentityLab({ apiUrl: runtime.apiUrl, portalUrl: runtime.portalUrl, frontendUrl: runtime.portalUrl, password: secrets.syntheticPassword, mfaAdapterUrl: adapter.url, mfaChannelToken: secrets.mfaChannelToken });
const repositoryRoot = resolve(fileURLToPath(new URL("../../../", import.meta.url)));
const require = createRequire(join(repositoryRoot, "coro-backend", "package.json"));
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
try {
  const source = await prisma.exerciseActionItem.findFirstOrThrow({ where: { correctiveAction: { is: { status: "CLOSED" } } }, orderBy: { createdAt: "desc" },
    select: { id: true, report: { select: { buildingId: true } }, correctiveAction: { select: { id: true } } } });
  const report = await runExerciseRexBrowser({ runtime, lab, source: { actionItemId: source.id, correctiveActionId: source.correctiveAction.id, buildingId: source.report.buildingId } });
  console.log(JSON.stringify({ status: report.status, matrix: `${report.results.filter((item) => item.status === "PASS").length}/12`, criticalErrors: report.criticalErrors.length }));
  if (report.status !== "PASS") process.exitCode = 1;
} finally { await prisma.$disconnect(); await adapter.close(); }
