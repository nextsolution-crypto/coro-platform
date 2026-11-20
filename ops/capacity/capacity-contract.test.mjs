import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const audit = fs.readFileSync(new URL("./coro-capacity-audit.sh", import.meta.url), "utf8");
const workflow = fs.readFileSync(new URL("../../.github/workflows/production-capacity-audit.yml", import.meta.url), "utf8");

test("audit is lock-aware and protects active, rollback and container images", () => {
  assert.match(audit, /coro-production-deployment\.lock/);
  assert.match(audit, /DEPLOYMENT_LOCK_BUSY/);
  assert.match(audit, /ACTIVE_RELEASE/);
  assert.match(audit, /ROLLBACK_RELEASE/);
  assert.match(audit, /CONTAINER_REFERENCE/);
  assert.match(audit, /rollbackReady/);
});

test("audit accounts only for the four deployed application images", () => {
  assert.match(audit, /\["backend","frontend","clientPortal","website"\]/);
  assert.match(audit, /ACTIVE_IMAGE_SET_INVALID/);
  assert.doesNotMatch(audit, /Object\.values\(m\.images/);
});

test("audit never mutates docker, volumes, backups or evidence", () => {
  assert.doesNotMatch(audit, /docker (image )?(rm|prune)|docker system prune|docker volume (rm|prune)|rm -rf|find .* -delete/);
  assert.match(audit, /cleanupCandidates/);
  assert.match(audit, /smsEvidenceBytes/);
});

test("workflow records sanitized immutable log evidence and has no command input", () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /immutable GitHub job log contains the sanitized capacity report/);
  assert.match(workflow, /SERVER_SSH_ECDSA_HOST_FINGERPRINT/);
  assert.doesNotMatch(workflow, /command:.*inputs|script:.*inputs/);
});
