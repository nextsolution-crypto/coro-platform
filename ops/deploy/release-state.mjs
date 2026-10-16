import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const RELEASE_STATES = Object.freeze([
  "PREPARED",
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "UNKNOWN",
  "ROLLED_BACK",
]);

const TRANSITIONS = Object.freeze({
  PREPARED: new Set(["RUNNING", "UNKNOWN"]),
  RUNNING: new Set(["SUCCEEDED", "FAILED", "UNKNOWN"]),
  SUCCEEDED: new Set(["ROLLED_BACK"]),
  FAILED: new Set(["ROLLED_BACK"]),
  UNKNOWN: new Set(["SUCCEEDED", "FAILED", "ROLLED_BACK"]),
  ROLLED_BACK: new Set(),
});

const SHA40 = /^[0-9a-f]{40}$/;
const SHA64 = /^[0-9a-f]{64}$/;
const IMAGE = /^ghcr\.io\/[a-z0-9_.-]+\/[a-z0-9_.-]+@sha256:[0-9a-f]{64}$/;

export function checksum(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function statePaths(root, releaseId) {
  if (!/^production-[0-9a-f]{40}$/.test(releaseId))
    throw new Error("RELEASE_ID_INVALID");
  return {
    state: path.join(root, `${releaseId}.state.json`),
    checksum: path.join(root, `${releaseId}.state.sha256`),
    history: path.join(root, `${releaseId}.events.jsonl`),
    reservation: path.join(root, `${releaseId}.prepare.lock`),
    transitionLock: path.join(root, `${releaseId}.transition.lock`),
  };
}

function atomicWrite(file, contents, mode = 0o600) {
  const temporary = `${file}.tmp-${process.pid}-${crypto.randomBytes(6).toString("hex")}`;
  fs.writeFileSync(temporary, contents, { flag: "wx", mode });
  fs.renameSync(temporary, file);
}

function persist(root, state) {
  const files = statePaths(root, state.releaseId);
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  const body = `${JSON.stringify(state, null, 2)}\n`;
  atomicWrite(files.state, body);
  atomicWrite(
    files.checksum,
    `${checksum(body)}  ${path.basename(files.state)}\n`,
  );
  fs.appendFileSync(files.history, `${JSON.stringify(state)}\n`, {
    mode: 0o600,
  });
  return state;
}

export function readState(root, releaseId) {
  const files = statePaths(root, releaseId);
  const body = fs.readFileSync(files.state);
  const recorded = fs
    .readFileSync(files.checksum, "utf8")
    .trim()
    .split(/\s+/)[0];
  if (!SHA64.test(recorded) || checksum(body) !== recorded)
    throw new Error("STATE_CHECKSUM_INVALID");
  const state = JSON.parse(body);
  if (state.releaseId !== releaseId || !RELEASE_STATES.includes(state.state))
    throw new Error("STATE_INVALID");
  return state;
}

export function prepareState(root, input, now = new Date()) {
  if (!SHA40.test(input.gitCommit || ""))
    throw new Error("RELEASE_COMMIT_INVALID");
  if (
    !Array.isArray(input.images) ||
    input.images.length !== 4 ||
    !input.images.every((value) => IMAGE.test(value))
  ) {
    throw new Error("RELEASE_IMAGES_INVALID");
  }
  const releaseId = `production-${input.gitCommit}`;
  const files = statePaths(root, releaseId);
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  if (fs.existsSync(files.state) || fs.existsSync(files.checksum)) {
    const existing = readState(root, releaseId);
    if (
      existing.gitCommit !== input.gitCommit ||
      JSON.stringify(existing.images) !== JSON.stringify(input.images)
    ) {
      throw new Error("DUPLICATE_RELEASE_CONFLICT");
    }
    return { state: existing, created: false };
  }
  try {
    fs.closeSync(fs.openSync(files.reservation, "wx", 0o600));
  } catch (error) {
    if (error.code === "EEXIST")
      throw new Error("RELEASE_PREPARATION_INCOMPLETE_OR_CONCURRENT");
    throw error;
  }
  const timestamp = now.toISOString();
  const state = {
    schemaVersion: 1,
    releaseId,
    gitCommit: input.gitCommit,
    images: input.images,
    operator: input.operator,
    state: "PREPARED",
    stage: "PREPARED",
    startedAt: null,
    completedAt: null,
    updatedAt: timestamp,
    previousReleaseId: input.previousReleaseId || null,
    backupCheckpointId: null,
    restoreEvidence: null,
    migrationHead: null,
    healthChecks: null,
    manifestPath: null,
    manifestSha256: null,
    failureCode: null,
    githubTransport: "CONNECTED",
  };
  persist(root, state);
  return { state, created: true };
}

export function transitionState(
  root,
  releaseId,
  next,
  patch = {},
  now = new Date(),
) {
  if (!RELEASE_STATES.includes(next))
    throw new Error("STATE_TRANSITION_TARGET_INVALID");
  const files = statePaths(root, releaseId);
  let lock;
  try {
    lock = fs.openSync(files.transitionLock, "wx", 0o600);
  } catch (error) {
    if (error.code === "EEXIST") throw new Error("STATE_TRANSITION_BUSY");
    throw error;
  }
  try {
    const current = readState(root, releaseId);
    if (current.state === next) return current;
    if (!TRANSITIONS[current.state].has(next))
      throw new Error(`STATE_TRANSITION_INVALID_${current.state}_TO_${next}`);
    if (
      next === "ROLLED_BACK" &&
      patch.rollbackAuthorization !== "ROLLBACK_APPLICATIONS"
    ) {
      throw new Error("ROLLBACK_AUTHORIZATION_MISSING");
    }
    const timestamp = now.toISOString();
    const updated = {
      ...current,
      ...patch,
      rollbackAuthorization: undefined,
      state: next,
      stage: patch.stage || next,
      startedAt: current.startedAt || (next === "RUNNING" ? timestamp : null),
      completedAt: ["SUCCEEDED", "FAILED", "ROLLED_BACK"].includes(next)
        ? timestamp
        : null,
      updatedAt: timestamp,
    };
    delete updated.rollbackAuthorization;
    if (next === "SUCCEEDED") {
      if (!updated.manifestPath || !SHA64.test(updated.manifestSha256 || ""))
        throw new Error("SUCCESS_EVIDENCE_INCOMPLETE");
      if (
        !updated.backupCheckpointId ||
        updated.restoreEvidence !== "RESTORE_VERIFIED" ||
        !updated.migrationHead ||
        !updated.healthChecks
      ) {
        throw new Error("SUCCESS_GATES_INCOMPLETE");
      }
    }
    if (next === "FAILED" && !updated.failureCode)
      throw new Error("FAILURE_CODE_MISSING");
    return persist(root, updated);
  } finally {
    if (lock !== undefined) fs.closeSync(lock);
    fs.rmSync(files.transitionLock, { force: true });
  }
}

export function reconcileEvidence(state, evidence) {
  if (state.state !== "SUCCEEDED")
    return {
      outcome: state.state,
      deployable: false,
      reason: `STATE_${state.state}`,
    };
  const conflicts = [];
  if (evidence.gitCommit !== state.gitCommit) conflicts.push("COMMIT_MISMATCH");
  if (evidence.manifestSha256 !== state.manifestSha256)
    conflicts.push("MANIFEST_CHECKSUM_MISMATCH");
  if (JSON.stringify(evidence.images) !== JSON.stringify(state.images))
    conflicts.push("ACTIVE_IMAGE_MISMATCH");
  if (evidence.migrationHead !== state.migrationHead)
    conflicts.push("MIGRATION_HEAD_MISMATCH");
  if (!evidence.containersHealthy) conflicts.push("CONTAINER_HEALTH_FAILED");
  if (!evidence.lockAvailable) conflicts.push("DEPLOYMENT_LOCK_BUSY");
  if (conflicts.length)
    return {
      outcome: "UNKNOWN",
      deployable: false,
      reason: conflicts.join(","),
    };
  return { outcome: "SUCCEEDED", deployable: true, reason: null };
}

function option(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

if (import.meta.url === `file://${process.argv[1]?.replaceAll("\\", "/")}`) {
  try {
    const command = process.argv[2];
    const root = option("root") || "/opt/coro-ops/releases/state";
    const releaseId = option("release-id");
    if (command === "prepare") {
      const input = JSON.parse(fs.readFileSync(option("input"), "utf8"));
      process.stdout.write(`${JSON.stringify(prepareState(root, input))}\n`);
    } else if (command === "read") {
      process.stdout.write(`${JSON.stringify(readState(root, releaseId))}\n`);
    } else if (command === "transition") {
      const patchFile = option("patch");
      const patch = patchFile
        ? JSON.parse(fs.readFileSync(patchFile, "utf8"))
        : {};
      process.stdout.write(
        `${JSON.stringify(transitionState(root, releaseId, option("to"), patch))}\n`,
      );
    } else if (command === "reconcile") {
      const state = readState(root, releaseId);
      const evidence = JSON.parse(fs.readFileSync(option("evidence"), "utf8"));
      const result = reconcileEvidence(state, evidence);
      process.stdout.write(`${JSON.stringify(result)}\n`);
      if (!result.deployable) process.exitCode = 1;
    } else {
      throw new Error("COMMAND_INVALID");
    }
  } catch (error) {
    process.stderr.write(`release-state=FAIL code=${error.message}\n`);
    process.exitCode = 1;
  }
}
