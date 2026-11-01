import assert from "node:assert/strict";
import test from "node:test";
import { validateRollbackSecurity } from "./rollback-security-policy.mjs";

const ref = (name, digit) => `ghcr.io/nextsolution-crypto/${name}@sha256:${digit.repeat(64)}`;
const images = [ref("coro-backend", "1"), ref("coro-frontend", "2"), ref("coro-client-portal", "3"), ref("coro-website", "4")];
const commit = "a".repeat(40);
const oldHead = "20261117010000_building_governance";
const currentHead = "20261118010000_organization_settings_governance";
const manifest = { previousCommit: commit, previousImages: images, previousMigrationHead: oldHead };
const approval = {
  id: "qa-approved-set",
  previousCommit: commit,
  images,
  compatibleDatabaseHeads: [currentHead],
  requiredKeyIds: ["outbox-v1"],
  workerCompatibility: "COMPATIBLE",
  status: "APPROVED",
  reason: "synthetic compatible rollback",
  reviewedAt: "2026-11-01T00:00:00Z",
};
const runtime = { phase: "EXECUTION", migrationHead: currentHead, availableKeyIds: ["outbox-v1"], workerState: "QUIESCED" };

test("accepts only an explicitly approved compatible set", () => {
  const result = validateRollbackSecurity({ manifest, policy: { schemaVersion: 1, blockedRollbackImages: [], approvedRollbackSets: [approval] }, runtime });
  assert.equal(result.approvalId, "qa-approved-set");
});
test("refuses a known dangerous digest before approval", () => {
  assert.throws(() => validateRollbackSecurity({ manifest, policy: { schemaVersion: 1, blockedRollbackImages: [images[0]], approvedRollbackSets: [approval] }, runtime }), /IMAGE_BLOCKED/);
});

test("refuses an unreviewed rollback set", () => {
  assert.throws(() => validateRollbackSecurity({ manifest, policy: { schemaVersion: 1, blockedRollbackImages: [], approvedRollbackSets: [] }, runtime }), /APPROVAL_MISSING/);
});

test("refuses schema, key and worker incompatibilities independently", () => {
  const policy = { schemaVersion: 1, blockedRollbackImages: [], approvedRollbackSets: [approval] };
  assert.throws(() => validateRollbackSecurity({ manifest, policy, runtime: { ...runtime, migrationHead: "20261119010000_future" } }), /SCHEMA_INCOMPATIBLE/);
  assert.throws(() => validateRollbackSecurity({ manifest, policy, runtime: { ...runtime, availableKeyIds: [] } }), /KEY_UNAVAILABLE/);
  assert.throws(() => validateRollbackSecurity({ manifest, policy, runtime: { ...runtime, workerState: "RUNNING" } }), /WORKER_UNSAFE/);
});

test("permits a non-mutating preflight while requiring quiescence at execution", () => {
  const policy = { schemaVersion: 1, blockedRollbackImages: [], approvedRollbackSets: [approval] };
  assert.equal(validateRollbackSecurity({ manifest, policy, runtime: { ...runtime, phase: "PREFLIGHT", workerState: "RUNNING" } }).phase, "PREFLIGHT");
  assert.throws(() => validateRollbackSecurity({ manifest, policy, runtime: { ...runtime, phase: "EXECUTION", workerState: "RUNNING" } }), /WORKER_UNSAFE/);
});
