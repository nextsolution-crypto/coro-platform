import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { validateApplicationCommit } from "./validate-demo-report-application-commit.mjs";

const image = (name, digit) =>
  `ghcr.io/nextsolution-crypto/${name}@sha256:${digit.repeat(64)}`;

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function commit(cwd, value) {
  fs.writeFileSync(path.join(cwd, "fixture.txt"), value);
  git(cwd, "add", "fixture.txt");
  git(cwd, "commit", "-m", value);
  return git(cwd, "rev-parse", "HEAD");
}

test("accepts only a registered application commit that is an ancestor of tooling HEAD", () => {
  const repository = fs.mkdtempSync(path.join(os.tmpdir(), "coro-report-app-sha-"));
  try {
    git(repository, "init", "-b", "main");
    git(repository, "config", "user.email", "qa@getcoro.invalid");
    git(repository, "config", "user.name", "CORO QA");
    const applicationCommit = commit(repository, "application");
    git(repository, "branch", "application-line");
    commit(repository, "tooling");
    git(repository, "checkout", "--orphan", "unrelated");
    git(repository, "rm", "-f", "fixture.txt");
    const nonAncestor = commit(repository, "unrelated");
    git(repository, "checkout", "main");

    const release = {
      migrationHead: "20261224010000_incident_report_historical_search",
      images: {
        backend: image("coro-backend", "1"),
        frontend: image("coro-frontend", "2"),
        clientPortal: image("coro-client-portal", "3"),
        website: image("coro-website", "4"),
      },
    };
    const policyPath = path.join(repository, "policy.json");
    fs.writeFileSync(
      policyPath,
      JSON.stringify({
        schemaVersion: 1,
        releases: { [applicationCommit]: release, [nonAncestor]: release },
      }),
    );

    assert.deepEqual(
      validateApplicationCommit(applicationCommit, { repository, policyPath }),
      release,
    );
    assert.throws(
      () => validateApplicationCommit("f".repeat(40), { repository, policyPath }),
      /APPLICATION_COMMIT_UNKNOWN/,
    );
    assert.throws(
      () => validateApplicationCommit(nonAncestor, { repository, policyPath }),
      /APPLICATION_COMMIT_NOT_ANCESTOR/,
    );
    const unregistered = commit(repository, "unregistered");
    assert.throws(
      () => validateApplicationCommit(unregistered, { repository, policyPath }),
      /APPLICATION_COMMIT_NOT_APPROVED/,
    );
  } finally {
    fs.rmSync(repository, { recursive: true, force: true });
  }
});
