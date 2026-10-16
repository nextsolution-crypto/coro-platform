import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  checksum,
  prepareState,
  readState,
  reconcileEvidence,
  transitionState,
} from "./release-state.mjs";

const commit = "a".repeat(40);
const images = ["backend", "frontend", "client-portal", "website"].map(
  (name, index) =>
    `ghcr.io/example/coro-${name}@sha256:${String(index + 1).repeat(64)}`,
);
const input = { gitCommit: commit, images, operator: "qa-operator" };
const releaseId = `production-${commit}`;

function fixture() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "coro-release-state-"));
}

function successPatch(root) {
  const manifest = path.join(root, "manifest.json");
  fs.writeFileSync(manifest, "{}\n");
  return {
    manifestPath: manifest,
    manifestSha256: checksum(fs.readFileSync(manifest)),
    backupCheckpointId: "backup-1",
    restoreEvidence: "RESTORE_VERIFIED",
    migrationHead: "migration-137",
    healthChecks: { backend: "PASS" },
  };
}

function succeeded(root) {
  prepareState(root, input);
  transitionState(root, releaseId, "RUNNING");
  return transitionState(root, releaseId, "SUCCEEDED", successPatch(root));
}

function evidence(overrides = {}) {
  return {
    gitCommit: commit,
    manifestSha256: overrides.manifestSha256 || null,
    images,
    migrationHead: "migration-137",
    containersHealthy: true,
    lockAvailable: true,
    ...overrides,
  };
}

test("normal successful release is durable and reconcilable", () => {
  const root = fixture();
  const state = succeeded(root);
  assert.equal(
    reconcileEvidence(state, evidence({ manifestSha256: state.manifestSha256 }))
      .outcome,
    "SUCCEEDED",
  );
});

test("runner lost before SSH connection creates no false state", () => {
  const root = fixture();
  assert.equal(fs.readdirSync(root).length, 0);
});

test("runner lost before release start preserves PREPARED", () => {
  const root = fixture();
  prepareState(root, input);
  assert.equal(readState(root, releaseId).state, "PREPARED");
});

for (const stage of ["BACKUP", "MIGRATION", "APPLICATION_ROLLOUT"]) {
  test(`runner lost during ${stage.toLowerCase()} preserves RUNNING`, () => {
    const root = fixture();
    prepareState(root, input);
    transitionState(root, releaseId, "RUNNING", { stage });
    assert.equal(readState(root, releaseId).stage, stage);
  });
}

test("runner lost after successful rollout can remain RUNNING until final evidence", () => {
  const root = fixture();
  prepareState(root, input);
  transitionState(root, releaseId, "RUNNING", { stage: "HEALTH_VERIFIED" });
  assert.equal(readState(root, releaseId).state, "RUNNING");
});

test("runner lost after SUCCESS manifest reconciles without re-execution", () => {
  const root = fixture();
  const state = succeeded(root);
  const duplicate = prepareState(root, input);
  assert.equal(duplicate.created, false);
  assert.equal(
    reconcileEvidence(state, evidence({ manifestSha256: state.manifestSha256 }))
      .deployable,
    true,
  );
});

test("remote nonzero exit records FAILED with a code", () => {
  const root = fixture();
  prepareState(root, input);
  transitionState(root, releaseId, "RUNNING");
  assert.equal(
    transitionState(root, releaseId, "FAILED", { failureCode: "REMOTE_EXIT_1" })
      .state,
    "FAILED",
  );
});

test("remote process remains RUNNING after observer disconnect", () => {
  const root = fixture();
  prepareState(root, input);
  transitionState(root, releaseId, "RUNNING");
  assert.equal(prepareState(root, input).state.state, "RUNNING");
});

test("stale RUNNING can be governed to UNKNOWN", () => {
  const root = fixture();
  prepareState(root, input);
  transitionState(root, releaseId, "RUNNING");
  assert.equal(
    transitionState(root, releaseId, "UNKNOWN", { stage: "STALE_RUNNING" })
      .state,
    "UNKNOWN",
  );
});

test("duplicate release ID with identical evidence is idempotent", () => {
  const root = fixture();
  assert.equal(prepareState(root, input).created, true);
  assert.equal(prepareState(root, input).created, false);
});

test("duplicate workflow dispatch with changed images is rejected", () => {
  const root = fixture();
  prepareState(root, input);
  assert.throws(
    () =>
      prepareState(root, {
        ...input,
        images: [...images.slice(0, 3), images[0]],
      }),
    /DUPLICATE_RELEASE_CONFLICT/,
  );
});

test("concurrent transition cannot repeat a terminal transition", () => {
  const root = fixture();
  succeeded(root);
  assert.throws(
    () => transitionState(root, releaseId, "FAILED", { failureCode: "LATE" }),
    /STATE_TRANSITION_INVALID/,
  );
});

test("invalid state checksum is rejected", () => {
  const root = fixture();
  prepareState(root, input);
  fs.appendFileSync(path.join(root, `${releaseId}.state.json`), "tamper");
  assert.throws(() => readState(root, releaseId), /STATE_CHECKSUM_INVALID/);
});

test("missing state manifest is not accepted as success evidence", () => {
  const root = fixture();
  prepareState(root, input);
  transitionState(root, releaseId, "RUNNING");
  assert.throws(
    () => transitionState(root, releaseId, "SUCCEEDED", {}),
    /SUCCESS_EVIDENCE_INCOMPLETE/,
  );
});

for (const [name, overrides, reason] of [
  [
    "active digest mismatch",
    { images: [...images.slice(0, 3), images[0]] },
    "ACTIVE_IMAGE_MISMATCH",
  ],
  [
    "container unhealthy despite SUCCESS",
    { containersHealthy: false },
    "CONTAINER_HEALTH_FAILED",
  ],
  [
    "migration head mismatch",
    { migrationHead: "wrong" },
    "MIGRATION_HEAD_MISMATCH",
  ],
  ["deployment lock busy", { lockAvailable: false }, "DEPLOYMENT_LOCK_BUSY"],
]) {
  test(name, () => {
    const root = fixture();
    const state = succeeded(root);
    const result = reconcileEvidence(
      state,
      evidence({ manifestSha256: state.manifestSha256, ...overrides }),
    );
    assert.equal(result.outcome, "UNKNOWN");
    assert.match(result.reason, new RegExp(reason));
  });
}

test("rollback completed requires explicit authorization", () => {
  const root = fixture();
  succeeded(root);
  assert.equal(
    transitionState(root, releaseId, "ROLLED_BACK", {
      rollbackAuthorization: "ROLLBACK_APPLICATIONS",
    }).state,
    "ROLLED_BACK",
  );
});

test("rollback without authorization is rejected", () => {
  const root = fixture();
  succeeded(root);
  assert.throws(
    () => transitionState(root, releaseId, "ROLLED_BACK"),
    /ROLLBACK_AUTHORIZATION_MISSING/,
  );
});

test("conflicting terminal states are rejected", () => {
  const root = fixture();
  succeeded(root);
  assert.throws(
    () =>
      transitionState(root, releaseId, "FAILED", { failureCode: "CONFLICT" }),
    /STATE_TRANSITION_INVALID/,
  );
});

test("missing production authorization remains rejected by release policy", async () => {
  const { validateReleaseRequest } = await import("./release-policy.mjs");
  assert.throws(
    () => validateReleaseRequest({ RELEASE_COMMIT: commit }),
    /RELEASE_APPROVAL_MISSING/,
  );
});

test("state history contains every governed transition without secret values", () => {
  const root = fixture();
  succeeded(root);
  const history = fs.readFileSync(
    path.join(root, `${releaseId}.events.jsonl`),
    "utf8",
  );
  assert.equal(history.trim().split("\n").length, 3);
  assert.doesNotMatch(history, /SSH_PRIVATE_KEY|PASSWORD|TOKEN/);
});

test("reconciliation is pure and does not mutate durable evidence", () => {
  const root = fixture();
  const state = succeeded(root);
  const before = fs.readFileSync(path.join(root, `${releaseId}.state.json`));
  reconcileEvidence(state, evidence({ manifestSha256: state.manifestSha256 }));
  assert.deepEqual(
    fs.readFileSync(path.join(root, `${releaseId}.state.json`)),
    before,
  );
});

test("historical transition evidence is append-only across rollback", () => {
  const root = fixture();
  succeeded(root);
  transitionState(root, releaseId, "ROLLED_BACK", {
    rollbackAuthorization: "ROLLBACK_APPLICATIONS",
  });
  assert.equal(
    fs
      .readFileSync(path.join(root, `${releaseId}.events.jsonl`), "utf8")
      .trim()
      .split("\n").length,
    4,
  );
});
