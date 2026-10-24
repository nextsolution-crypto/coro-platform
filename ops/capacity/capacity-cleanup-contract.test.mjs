import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import test from "node:test";

const source = fs.readFileSync(new URL("./coro-capacity-cleanup.sh", import.meta.url), "utf8");

test("cleanup defaults to dry run and execute requires exact approval", () => {
  assert.match(source, /CAPACITY_CLEANUP_MODE:-DRY_RUN/);
  assert.match(source, /REMOVE_LISTED_UNREFERENCED_IMAGE_CACHE/);
});

test("cleanup protects all containers and active plus rollback manifests", () => {
  assert.match(source, /docker ps -aq/);
  assert.match(source, /Object\.values\(m\.images/);
  assert.match(source, /m\.previousImages/);
  assert.match(source, /DEPLOYMENT_LOCK_BUSY/);
});

test("cleanup is image-only and refuses broad pruning", () => {
  assert.match(source, /docker image rm "\$id"/);
  assert.doesNotMatch(source, /--force|docker system prune|docker volume|rm -rf|backup.*rm/);
});

// Reject invalid recovery requests before any production filesystem access.
test("cache age cannot be reduced below the two reviewed retention windows", () => {
  for (const value of ["0", "1", "23", "25", "-1", "invalid"]) {
    const result = spawnSync("bash", [new URL("./coro-capacity-cleanup.sh", import.meta.url).pathname], { env: { PATH: process.env.PATH, CAPACITY_CLEANUP_MINIMUM_AGE_HOURS: value }, encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /MINIMUM_AGE_INVALID/);
  }
});
test("24-hour recovery still refuses execution without explicit cleanup approval", () => {
  const result = spawnSync("bash", [new URL("./coro-capacity-cleanup.sh", import.meta.url).pathname], { env: { PATH: process.env.PATH, CAPACITY_CLEANUP_MODE: "EXECUTE", CAPACITY_CLEANUP_MINIMUM_AGE_HOURS: "24" }, encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /APPROVAL_MISSING/);
});
