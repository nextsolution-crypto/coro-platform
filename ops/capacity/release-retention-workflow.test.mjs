import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const deploy = fs.readFileSync(new URL("../../.github/workflows/deploy.yml", import.meta.url), "utf8");
const maintenance = fs.readFileSync(new URL("../../.github/workflows/production-capacity-maintenance.yml", import.meta.url), "utf8");
const reconcile = fs.readFileSync(new URL("../deploy/coro-release-reconcile.sh", import.meta.url), "utf8");
const bootstrap = fs.readFileSync(new URL("../../.github/workflows/production-release-reconciliation.yml", import.meta.url), "utf8");
const journal = fs.readFileSync(new URL("../../.github/workflows/production-journal-retention.yml", import.meta.url), "utf8");

test("pre, post and periodic maintenance share the deployment lock", () => {
  assert.match(deploy, /Run eligible pre-release capacity maintenance/);
  assert.match(deploy, /Rotate and clean after reconciled release/);
  assert.match(maintenance, /group: coro-production-deployment/);
  assert.match(maintenance, /cron:/);
});

test("all automatic mutation remains inert until explicit activation", () => {
  assert.equal((deploy.match(/CORO_RELEASE_RETENTION_AUTOMATION_ENABLED/g) || []).length, 2);
  assert.match(maintenance, /AUTOMATION_ENABLED/);
  assert.match(maintenance, /\[\[ "\$AUTOMATION_ENABLED" == true \]\]/);
});

test("only successful reconciliation emits atomic rotation authority", () => {
  assert.match(reconcile, /reconciled_marker/);
  assert.match(reconcile, /manifestSha256/);
  assert.match(reconcile, /mv -T --/);
  assert.ok(reconcile.indexOf("MIGRATION_HEAD_MISMATCH") < reconcile.indexOf("reconciled_marker"));
});

test("workflows never use broad Docker or volume pruning", () => {
  for (const source of [deploy, maintenance, bootstrap]) {
    assert.doesNotMatch(source, /docker system prune|docker volume prune|docker image prune/);
  }
});

test("historical reconciliation is manual, exact, locked and cannot deploy", () => {
  assert.match(bootstrap, /workflow_dispatch:/);
  assert.match(bootstrap, /RECONCILE_ACTIVE_RELEASE/);
  assert.match(bootstrap, /group: coro-production-deployment/);
  assert.match(bootstrap, /coro-release-reconcile\.sh/);
  assert.doesNotMatch(bootstrap, /coro-production-release|docker compose .*up|migrate deploy|CAPACITY_CLEANUP_MODE/);
});

test("journal policy activation is exact, reversible and shares the deployment lock", () => {
  assert.match(journal, /APPLY_REVIEWED_JOURNAL_POLICY/);
  assert.match(journal, /DISABLE_REVIEWED_JOURNAL_POLICY/);
  assert.match(journal, /group: coro-production-deployment/);
  assert.match(journal, /coro-production-deployment\.lock/);
  assert.match(journal, /systemctl reload systemd-journald/);
  assert.match(journal, /previous\.conf/);
  assert.doesNotMatch(journal, /docker .*prune|docker compose|migrate deploy/);
});
