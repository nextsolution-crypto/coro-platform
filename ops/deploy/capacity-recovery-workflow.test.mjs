import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const workflow = fs.readFileSync(
  new URL("../../.github/workflows/production-release-capacity-recovery.yml", import.meta.url),
  "utf8",
);

test("capacity recovery is gated and limited to old build cache", () => {
  assert.match(workflow, /environment: production-inspection/);
  assert.match(workflow, /environment: production\n/);
  assert.match(workflow, /docker builder prune --all --force --filter until=168h/);
  assert.doesNotMatch(workflow, /docker (?:image|system|volume|container) prune/);
  assert.match(workflow, /before_images=.*docker image ls/);
  assert.match(workflow, /\[\[ "\$before_images" == "\$after_images" \]\]/);
  assert.match(workflow, /\[\[ "\$before_containers" == "\$after_containers" \]\]/);
});

test("capacity recovery refuses concurrent release activity", () => {
  assert.match(workflow, /coro-production-deployment\.lock/);
  assert.match(workflow, /coro-release-control\.lock/);
  assert.match(workflow, /coro-release-\*\.service/);
});
