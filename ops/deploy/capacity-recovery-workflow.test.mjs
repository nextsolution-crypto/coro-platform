import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const workflow = fs.readFileSync(
  new URL("../../.github/workflows/production-release-capacity-recovery.yml", import.meta.url),
  "utf8",
);

test("capacity recovery delegates to the canonical active-plus-rollback retention policy", () => {
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /coro-capacity-cleanup\.sh/);
  assert.match(workflow, /release-retention-plan\.mjs/);
  assert.match(workflow, /release-retention-policy\.json/);
  assert.match(workflow, /candidate_commit:/);
  assert.match(workflow, /approved-immutable-releases\.json/);
  assert.match(workflow, /releases\.releases\?\.\[commit\]/);
  assert.match(workflow, /explicitCandidates/);
  assert.match(workflow, /candidateProtected=true/);
  assert.match(workflow, /activeAndRollbackProtected=true/);
  assert.match(workflow, /volumesDeleted=false/);
  assert.match(workflow, /backupsDeleted=false/);
  assert.doesNotMatch(workflow, /docker (?:system|volume|container|image) prune/);
});

test("capacity recovery refuses concurrent release activity", () => {
  assert.match(workflow, /group: coro-production-deployment/);
  assert.match(workflow, /coro-release-control\.lock/);
  assert.match(workflow, /flock --nonblock 8/);
});

test("dry-run and apply share the pinned protected host identity but retain distinct modes", () => {
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /CAPACITY_CLEANUP_MODE="\$cleanup_mode"/);
  assert.match(workflow, /EXECUTE_REVIEWED_RETENTION_POLICY/);
});
