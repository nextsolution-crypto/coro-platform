import test from "node:test";
import assert from "node:assert/strict";
import { resolveExerciseRexRuntime, sanitizedExerciseRexRuntime } from "../src/exercise-rex-runtime.mjs";

const valid = {
  CORO_QA_BACKEND_URL: "http://127.0.0.1:3181/api",
  CORO_QA_PORTAL_URL: "http://127.0.0.1:3182",
  CORO_QA_MFA_DIR: "D:\\CORO-QA\\runs\\p81-dynamic\\mfa",
  CORO_QA_ACTOR_FILE: "D:\\CORO-QA\\runs\\p81-dynamic\\actors.json",
  CORO_QA_EVIDENCE_DIR: "D:\\CORO-QA\\runs\\p81-dynamic\\evidence",
  CORO_QA_CDP_ENDPOINT: "http://127.0.0.1:9223",
};

test("resolves active dynamic runtime without campaign-specific paths", () => {
  const runtime = resolveExerciseRexRuntime(valid);
  assert.match(runtime.mfaDirectory, /p81-dynamic/i);
  assert.doesNotMatch(JSON.stringify(runtime), /p-?4\.3|p43-identity-lab/i);
});

test("fails closed when MFA configuration is absent", () => {
  const { CORO_QA_MFA_DIR: _, ...missing } = valid;
  assert.throws(() => resolveExerciseRexRuntime(missing), /CORO_QA_MFA_DIR is required/);
});

test("rejects non-loopback API origins", () => {
  assert.throws(() => resolveExerciseRexRuntime({ ...valid, CORO_QA_BACKEND_URL: "https://api.example.test" }), /loopback|local/i);
});

test("sanitized output contains no paths or secrets", () => {
  const report = JSON.stringify(sanitizedExerciseRexRuntime(resolveExerciseRexRuntime(valid)));
  assert.doesNotMatch(report, /CORO-QA|mfa\\|actors\.json|token|password|secret/i);
  assert.match(report, /127\.0\.0\.1/);
});

test("supports isolated dynamic ports", () => {
  const runtime = resolveExerciseRexRuntime({ ...valid, CORO_QA_BACKEND_URL: "http://127.0.0.1:49171/api", CORO_QA_PORTAL_URL: "http://127.0.0.1:49172" });
  assert.equal(new URL(runtime.apiUrl).port, "49171");
  assert.equal(new URL(runtime.portalUrl).port, "49172");
});

test("acceptance runner reuses one Founder session for authority and grants", async () => {
  const source = await import("node:fs/promises").then(({ readFile }) => readFile(new URL("../src/exercise-rex-acceptance.mjs", import.meta.url), "utf8"));
  assert.equal((source.match(/loginAs\("founder"\)/g) || []).length, 1);
  assert.match(source, /platform-authority\/draft/);
  assert.match(source, /platform-authority\/activate/);
});

test("runner dependencies resolve from the repository instead of the process working directory", async () => {
  const { readFile } = await import("node:fs/promises");
  for (const relative of ["../src/exercise-rex-acceptance.mjs", "../src/exercise-rex-browser.mjs", "../src/browser-orchestration.mjs"]) {
    const source = await readFile(new URL(relative, import.meta.url), "utf8");
    assert.match(source, /import\.meta\.url/);
    assert.doesNotMatch(source, /resolve\(["']coro-backend["']\)/);
  }
});

test("browser acceptance uses stable structural readiness selectors", async () => {
  const source = await import("node:fs/promises").then(({ readFile }) => readFile(new URL("../src/exercise-rex-browser-campaign.mjs", import.meta.url), "utf8"));
  assert.match(source, /a\[href\*=["']\\?\/corrective-actions\//);
  assert.match(source, /#next-action-title/);
  assert.doesNotMatch(source, /Action corrective li|Action ferm/);
});
