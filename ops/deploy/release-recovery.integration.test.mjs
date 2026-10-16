import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  prepareState,
  readState,
  reconcileEvidence,
  transitionState,
} from "./release-state.mjs";

const commit = "b".repeat(40);
const releaseId = `production-${commit}`;
const images = ["backend", "frontend", "client-portal", "website"].map(
  (name, index) =>
    `ghcr.io/example/coro-${name}@sha256:${String(index + 5).repeat(64)}`,
);

test("disposable QA survives observer loss and reconciles completed server work", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "coro-release-recovery-"));
  const manifest = path.join(root, "manifest.json");
  const input = { gitCommit: commit, images, operator: "qa" };
  fs.writeFileSync(manifest, JSON.stringify({ gitCommit: commit, images }));

  prepareState(root, input);
  transitionState(root, releaseId, "RUNNING");

  // The launching observer is now considered lost. A separate server process
  // persists completion, and a later observer only reads/reconciles it.
  const manifestSha256 = crypto
    .createHash("sha256")
    .update(fs.readFileSync(manifest))
    .digest("hex");
  transitionState(root, releaseId, "SUCCEEDED", {
    manifestPath: manifest,
    manifestSha256,
    backupCheckpointId: "qa-backup",
    restoreEvidence: "RESTORE_VERIFIED",
    migrationHead: "qa-migration-137",
    healthChecks: { backend: "PASS" },
  });
  const result = reconcileEvidence(readState(root, releaseId), {
    gitCommit: commit,
    manifestSha256,
    images,
    migrationHead: "qa-migration-137",
    containersHealthy: true,
    lockAvailable: true,
  });
  assert.deepEqual(result, {
    outcome: "SUCCEEDED",
    deployable: true,
    reason: null,
  });
  assert.equal(prepareState(root, input).created, false);
});
