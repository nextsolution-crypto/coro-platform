import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("./coro-capacity-cleanup.sh", import.meta.url), "utf8");

test("cleanup defaults to dry run and execute requires exact approval", () => {
  assert.match(source, /CAPACITY_CLEANUP_MODE:-DRY_RUN/);
  assert.match(source, /EXECUTE_REVIEWED_RETENTION_POLICY/);
});

test("cleanup protects all containers and active plus rollback manifests", () => {
  assert.match(source, /docker ps -aq/);
  assert.match(source, /protectedImages/);
  assert.match(source, /reconciled\.json/);
  assert.match(source, /DEPLOYMENT_LOCK_BUSY/);
});

test("cleanup is exact and refuses broad pruning and volumes", () => {
  assert.match(source, /docker image rm "\$id"/);
  assert.match(source, /docker builder prune -f --filter/);
  assert.doesNotMatch(source, /docker system prune|docker volume|rm -rf|backup.*rm/);
});

// Reject invalid recovery requests before any production filesystem access.
test("policy age comes only from the reviewed policy file", () => {
  assert.match(source, /p\.minimumImageAgeHours/);
  assert.doesNotMatch(source, /CAPACITY_CLEANUP_MINIMUM_AGE_HOURS/);
  assert.match(source, /v<12\|\|v>168/);
});
test("execution approval is checked before production path access", () => {
  assert.ok(source.indexOf("APPROVAL_MISSING") < source.indexOf("PATH_UNSAFE"));
});

test("cleanup is resumable, lock-aware and rechecks references before mutation", () => {
  assert.match(source, /flock --nonblock/);
  assert.match(source, /IMAGE_BECAME_REFERENCED/);
  assert.match(source, /IMAGE_BECAME_PROTECTED/);
  assert.match(source, /physicallyRecoveredBytes/);
  assert.match(source, /status=exited/);
});

test("temporary JSON evidence is parsed independently of file extension", () => {
  assert.doesNotMatch(source, /require\(process\.argv\[1\]\)/);
  assert.doesNotMatch(source, /marker=require\(process\.argv\[3\]\)/);
  assert.match(source, /JSON\.parse\(fs\.readFileSync/);
});
