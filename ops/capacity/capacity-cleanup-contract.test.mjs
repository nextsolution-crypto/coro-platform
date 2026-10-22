import assert from "node:assert/strict";
import fs from "node:fs";
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
