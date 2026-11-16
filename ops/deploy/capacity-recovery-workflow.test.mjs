import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const workflow = fs.readFileSync(
  new URL("../../.github/workflows/production-release-capacity-recovery.yml", import.meta.url),
  "utf8",
);

test("capacity recovery is gated and limited to old unreferenced Docker data", () => {
  assert.match(workflow, /environment: production-inspection/);
  assert.match(workflow, /environment: production\r?\n/);
  assert.match(workflow, /docker builder prune --all --force --filter until=168h/);
  assert.doesNotMatch(workflow, /docker image prune/);
  assert.match(workflow, /created_epoch < cutoff_epoch/);
  assert.match(workflow, /docker manifest inspect "\$digest"/);
  assert.match(workflow, /docker image rm "\$image_id"/);
  assert.match(workflow, /remote_recoverable=true/);
  assert.doesNotMatch(workflow, /docker (?:system|volume|container) prune/);
  assert.match(workflow, /before_container_images=.*docker ps --all/);
  assert.match(workflow, /\[\[ "\$before_container_images" == "\$after_container_images" \]\]/);
  assert.match(workflow, /\[\[ "\$before_containers" == "\$after_containers" \]\]/);
});

test("capacity recovery refuses concurrent release activity", () => {
  assert.match(workflow, /coro-production-deployment\.lock/);
  assert.match(workflow, /coro-release-control\.lock/);
  assert.match(workflow, /coro-release-\*\.service/);
});

test("dry-run explains image eligibility without exposing repositories", () => {
  assert.match(workflow, /CAPACITY_IMAGE_ELIGIBILITY/);
  assert.match(workflow, /old_without_coro_digest/);
  assert.match(workflow, /old_remote_unavailable/);
  assert.match(workflow, /old_remote_recoverable/);
});
