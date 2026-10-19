#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertSafeEnvironment,
  assertUnderQaRoot,
  redact,
  RUN_ROOT,
} from "./policy.mjs";

const sourceRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(sourceRoot, "..", "..", "..");

export const campaignStages = Object.freeze([
  { id: "seed", script: "seed-foundation.mjs" },
  { id: "authority", script: "govern-authority.mjs" },
  { id: "security", script: "api-smoke.mjs" },
  { id: "business", script: "business-smoke.mjs" },
  { id: "application-browser", script: "browser-smoke.cjs" },
  { id: "portal-browser", script: "portal-browser-smoke.cjs" },
]);

export function selectStages(from, through) {
  const first = from ? campaignStages.findIndex(({ id }) => id === from) : 0;
  const last = through
    ? campaignStages.findIndex(({ id }) => id === through)
    : campaignStages.length - 1;
  if (first < 0) throw new Error(`Unknown campaign start stage: ${from}`);
  if (last < 0) throw new Error(`Unknown campaign end stage: ${through}`);
  if (first > last) throw new Error("Campaign stage range is reversed.");
  return campaignStages.slice(first, last + 1);
}

export function assertCampaignEnvironment(stages) {
  assertSafeEnvironment();
  if (process.env.CORO_QA_CAMPAIGN_READY !== "true")
    throw new Error(
      "CORO_QA_CAMPAIGN_READY=true is required after infrastructure health checks.",
    );
  const required = new Set([
    "CORO_QA_BACKEND_URL",
    "CORO_QA_ACTOR_FILE",
    "CORO_QA_MFA_DIR",
    "CORO_QA_SYNTHETIC_PASSWORD",
  ]);
  if (stages.some(({ id }) => id.includes("browser"))) {
    required.add("CORO_QA_BROWSER_OUT");
    required.add("BENCH_BASE_URL");
  }
  const missing = [...required].filter((name) => !process.env[name]);
  if (missing.length)
    throw new Error(`Missing campaign configuration: ${missing.join(", ")}`);
}

function runStage(stage) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [join(sourceRoot, stage.script)], {
      cwd: repositoryRoot,
      env: process.env,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolvePromise();
      else
        reject(new Error(`${stage.id} failed (${signal || `exit ${code}`}).`));
    });
  });
}

export async function runCampaign(stages) {
  assertCampaignEnvironment(stages);
  const campaignId =
    process.env.CORO_QA_CAMPAIGN_ID || `campaign-${Date.now()}`;
  const evidenceRoot = assertUnderQaRoot(join(RUN_ROOT, campaignId));
  await mkdir(evidenceRoot, { recursive: false });
  const journal = {
    schemaVersion: 1,
    campaignId,
    startedAt: new Date().toISOString(),
    baseline: process.env.CORO_QA_BASELINE_SHA || "UNVERIFIED",
    stages: [],
  };
  const persist = () =>
    writeFile(
      join(evidenceRoot, "campaign.json"),
      JSON.stringify(redact(journal), null, 2),
    );
  await persist();
  for (const stage of stages) {
    const result = {
      id: stage.id,
      startedAt: new Date().toISOString(),
      status: "RUNNING",
    };
    journal.stages.push(result);
    await persist();
    try {
      await runStage(stage);
      result.status = "PASS";
    } catch (error) {
      result.status = "FAIL";
      result.error = error instanceof Error ? error.message : String(error);
      journal.completedAt = new Date().toISOString();
      await persist();
      throw error;
    }
    result.completedAt = new Date().toISOString();
    await persist();
  }
  journal.completedAt = new Date().toISOString();
  await persist();
  console.log(`Campaign evidence: ${evidenceRoot}`);
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const value = (name) =>
    process.argv
      .find((argument) => argument.startsWith(`--${name}=`))
      ?.split("=", 2)[1];
  const stages = selectStages(value("from"), value("through"));
  if (process.argv.includes("--plan"))
    console.log(stages.map(({ id }) => id).join("\n"));
  else await runCampaign(stages);
}
