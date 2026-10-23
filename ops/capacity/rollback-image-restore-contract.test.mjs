import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const script = fs.readFileSync(new URL("./coro-rollback-image-restore.sh", import.meta.url), "utf8");
const workflow = fs.readFileSync(new URL("../../.github/workflows/production-rollback-image-restore.yml", import.meta.url), "utf8");

test("restores only the four immutable rollback references from the active manifest", () => {
  assert.match(script, /m\.previousImages/);
  assert.match(script, /\$\{#rollback_refs\[@\]\}" -eq 4/);
  assert.match(script, /@sha256:\[0-9a-f\]\{64\}/);
  assert.match(script, /docker pull --platform linux\/amd64 "\$ref"/);
  assert.doesNotMatch(script, /docker compose|docker restart|docker system prune/);
});

test("fails closed and proves active containers are unchanged", () => {
  assert.match(script, /coro-production-deployment\.lock/);
  assert.match(script, /ACTIVE_CONTAINER_STATE_CHANGED/);
  assert.match(script, /ROLLBACK_SET_INCOMPLETE/);
  assert.match(script, /RESTORE_EXACT_MANIFEST_ROLLBACK_IMAGES/);
});

test("workflow uses production governance and immutable source", () => {
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /group: coro-production-maintenance/);
  assert.match(workflow, /merge-base --is-ancestor/);
  assert.match(workflow, /SERVER_SSH_ECDSA_HOST_FINGERPRINT/);
});
