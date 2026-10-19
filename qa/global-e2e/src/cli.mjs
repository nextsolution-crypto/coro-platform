#!/usr/bin/env node
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  assertSafeEnvironment,
  assertUnderQaRoot,
  redact,
  RUN_ROOT,
} from "./policy.mjs";
import { actors, smokeRequirements, viewports } from "./manifest.mjs";
import { startProviderCapture } from "./provider-capture.mjs";
import { startPrivateStorage } from "./private-storage.mjs";

async function check() {
  assertSafeEnvironment();
  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    qaRoot: RUN_ROOT,
    actors: actors.map(({ email: _email, ...actor }) => actor),
    viewports,
    services: [
      "postgresql-16",
      "backend",
      "frontend",
      "client-portal",
      "provider-capture",
      "private-storage",
    ],
    productionDependencies: [],
    externalDelivery: false,
  };
  await mkdir(assertUnderQaRoot(RUN_ROOT), { recursive: true });
  await writeFile(
    join(RUN_ROOT, "environment-manifest.json"),
    JSON.stringify(manifest, null, 2),
  );
  console.log("Isolation policy: PASS");
}

async function smoke() {
  await check();
  const evidence = join(RUN_ROOT, `smoke-${Date.now()}`);
  await mkdir(evidence, { recursive: true });
  const provider = await startProviderCapture({
    output: join(evidence, "provider.ndjson"),
  });
  const storage = await startPrivateStorage();
  const results = [];
  try {
    let response = await fetch(`${provider.url}/email`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-correlation-id": "e2e-provider-ok",
      },
      body: JSON.stringify({
        to: "founder@global-e2e.test",
        token: "must-redact",
        template: "qa",
      }),
    });
    results.push({
      id: "provider-capture",
      status: response.status === 202 ? "PASS" : "FAIL",
    });
    response = await fetch(`${provider.url}/sms`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-qa-failure": "true" },
      body: "{}",
    });
    results.push({
      id: "provider-failure-injection",
      status: response.status === 503 ? "PASS" : "FAIL",
    });
    response = await fetch(`${storage.url}/qa-bucket/tenant-a/document.pdf`);
    results.push({
      id: "storage-anonymous-denial",
      status: response.status === 403 ? "PASS" : "FAIL",
    });
    results.push(
      ...smokeRequirements.map((id) => ({
        id,
        status: id === "provider-capture" ? "PASS" : "NOT_RUN",
        reason:
          id === "provider-capture"
            ? undefined
            : "Application stack and synthetic dataset are required.",
      })),
    );
  } finally {
    await provider.close();
    await storage.close();
  }
  const report = redact({
    generatedAt: new Date().toISOString(),
    evidence,
    results,
  });
  await writeFile(
    join(evidence, "smoke.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(`Smoke evidence: ${evidence}`);
  if (results.some((item) => item.status === "FAIL")) process.exitCode = 1;
}

async function cleanup() {
  assertSafeEnvironment();
  const transient = assertUnderQaRoot(join(RUN_ROOT, "transient"));
  await rm(transient, { recursive: true, force: true });
  console.log("Transient QA resources removed. Sanitized evidence retained.");
}

const command = process.argv[2] || "check";
if (command === "check") await check();
else if (command === "smoke") await smoke();
else if (command === "cleanup") await cleanup();
else throw new Error(`Unknown command: ${command}`);
