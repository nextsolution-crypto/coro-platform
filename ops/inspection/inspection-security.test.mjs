import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const reporter = fileURLToPath(
  new URL("./inspection-report.mjs", import.meta.url),
);
const digest = `ghcr.io/example/app@sha256:${"a".repeat(64)}`;
const migration = (name, checksumSeed) => ({
  name,
  checksum: checksumSeed.repeat(64),
});
const historicalMigrations = Array.from({ length: 136 }, (_, index) =>
  migration(`1900010100${String(index).padStart(4, "0")}_historical`, "1"),
);
const migration137 = migration(
  "20261023010000_rendement_financial_governance",
  "2",
);
const migration138 = migration("20261024010000_platform_authority", "3");
const migration139 = migration(
  "20261025010000_financial_platform_authority_alignment",
  "4",
);
const migrations137 = [...historicalMigrations, migration137];
const migrations138 = [...migrations137, migration138];
const migrations139 = [...migrations138, migration139];

function fixture(overrides = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "coro-inspection-test-"));
  const write = (name, value) =>
    fs.writeFileSync(
      path.join(root, name),
      typeof value === "string" ? value : JSON.stringify(value),
    );
  write("commit", "a".repeat(40));
  write("compose-sha256", "b".repeat(64));
  write(
    "disk",
    "Filesystem 1024-blocks Used Available Capacity Mounted on\n/dev/test 100 10 90 10% /opt",
  );
  write("locks.json", { locks: [] });
  write("systemd", "Id=coro-db-backup.timer\nActiveState=active");
  write("source-migrations.json", overrides.sourceMigrations ?? migrations138);
  for (const name of [
    "coro_backend",
    "coro_frontend",
    "coro_client_portal",
    "coro_website",
    "coro_postgres",
  ]) {
    write(`${name}.json`, {
      State: { Running: true, Health: { Status: "healthy" } },
      RestartCount: 0,
      Image: `sha256:${"c".repeat(64)}`,
    });
    write(`${name}.image.json`, { RepoDigests: [digest] });
  }
  write("database.json", {
    postgresVersion: "16",
    migrationCount: 138,
    migrationHead: "20261024010000_platform_authority",
    migrationHistory: migrations138,
    failedMigrations: 0,
    rolledBackMigrations: 0,
    platformAuthorityMigrationApplied: true,
    authorityTablePresent: true,
    grantTablePresent: true,
    authorityRecordCount: 1,
    authority: {
      id: "PRIMARY",
      status: "ACTIVE",
      operatorOrganizationId: "operator",
      founderUserId: "founder",
      lockVersion: 0,
    },
    grantCount: 0,
    activeCustomerGrantCount: 0,
    operator: { id: "operator", exists: true, active: true, internal: true },
    founder: {
      id: "founder",
      exists: true,
      active: true,
      role: "SUPER_ADMIN",
      organizationId: "operator",
    },
    activeSuperAdminCount: 1,
    customerSuperAdminCount: 0,
    ...overrides.database,
  });
  write("backup-state.json", {
    consecutiveFailures: 0,
    lastBackupId: "backup-1",
    lastSuccessAt: new Date().toISOString(),
  });
  const backup = path.join(root, "backup.remote.manifest.json");
  write("backup.remote.manifest.json", {
    backupId: "backup-1",
    status: "REMOTE_VERIFIED",
    remoteVerification: "PASSED",
    sha256: "d".repeat(64),
    remoteVersionId: "version-1",
    ...overrides.backup,
  });
  write("latest-backup", `1 ${backup}`);
  write("remote-head.json", {
    VersionId: "version-1",
    Metadata: { sha256: "d".repeat(64) },
    ...overrides.remoteHead,
  });
  const restore = path.join(root, "restore.restore-report.json");
  write("restore.restore-report.json", {
    restoreId: "restore-1",
    status: "RESTORE_VERIFIED",
    completedAt: "2026-10-16T00:00:00.000Z",
    expectedSha256: "e".repeat(64),
    verifiedSha256: "e".repeat(64),
    remoteVersionId: "restore-version-1",
    ...overrides.restore,
  });
  write("latest-restore", `1 ${restore}`);
  const release = path.join(root, "production-release.json");
  write("production-release.json", {
    releaseId: "production-a",
    status: "SUCCESS",
    gitCommit: "a".repeat(40),
    expectedMigrationHead: "20261024010000_platform_authority",
    images: {
      backend: digest,
      frontend: digest,
      clientPortal: digest,
      website: digest,
    },
    previousImages: [digest, digest, digest, digest],
    ...overrides.release,
  });
  write("latest-release", `1 ${release}`);
  const releaseManifestSha256 = crypto
    .createHash("sha256")
    .update(fs.readFileSync(release))
    .digest("hex");
  write("release-manifest-sha256", releaseManifestSha256);
  const releaseState = path.join(root, "production-release.state.json");
  write("production-release.state.json", {
    releaseId: "production-a",
    state: "SUCCEEDED",
    stage: "COMPLETED",
    gitCommit: "a".repeat(40),
    manifestSha256: releaseManifestSha256,
    migrationHead: "20261024010000_platform_authority",
    images: [digest, digest, digest, digest],
    ...overrides.releaseState,
  });
  write("latest-release-state", `1 ${releaseState}`);
  write(
    "rollback-available-count",
    String(overrides.rollbackAvailableCount ?? 4),
  );
  return root;
}

function run(root) {
  return spawnSync(process.execPath, [reporter, root], { encoding: "utf8" });
}

test("emits a sanitized GO report for complete coherent evidence", () => {
  const root = fixture();
  try {
    const result = run(root);
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.assessment, "GO");
    assert.equal(report.inspectionExecution, "PASS");
    assert.equal(report.platformAuthorityState, "ACTIVE");
    assert.equal(report.schemaPhase, "PLATFORM_AUTHORITY_AVAILABLE");
    assert.equal(report.releaseReadiness, "GO");
    assert.equal(report.bootstrapReadiness, "ALREADY_ACTIVE");
    assert.equal(report.mainFreezeReadiness, "READY");
    assert.equal(report.production.database.migrationCount, 138);
    assert.doesNotMatch(
      result.stdout,
      /password|secret|access[_-]?key|private[_-]?key/i,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("allows validated public migration identifiers containing secret-like words", () => {
  const passwordMigration = migration(
    "20260817221759_add_reset_token_to_user",
    "5",
  );
  const history = [
    ...migrations138,
    passwordMigration,
  ];
  const root = fixture({
    sourceMigrations: history,
    database: {
      migrationCount: history.length,
      migrationHead: passwordMigration.name,
      migrationHistory: history,
    },
    release: { expectedMigrationHead: passwordMigration.name },
    releaseState: { migrationHead: passwordMigration.name },
  });
  try {
    const result = run(root);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).inspectionExecution, "PASS");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("fails closed when a real secret pattern appears outside migration identifiers", () => {
  const root = fixture();
  fs.writeFileSync(
    path.join(root, "systemd"),
    "Id=coro-db-backup.timer\nActiveState=active\npassword=synthetic-test-value",
  );
  try {
    const result = run(root);
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /REPORT_SECRET_PATTERN_DETECTED/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("fails closed when a sensitive field is injected into database evidence", () => {
  const root = fixture({ database: { accessKey: "synthetic-test-value" } });
  try {
    const result = run(root);
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /REPORT_SECRET_PATTERN_DETECTED/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("fails closed for invalid remote backup evidence", () => {
  const root = fixture({
    backup: { status: "LOCAL_VERIFIED", remoteVerification: "FAILED" },
  });
  try {
    const result = run(root);
    assert.equal(result.status, 2);
    assert.ok(
      JSON.parse(result.stdout).issues.includes("REMOTE_BACKUP_INVALID"),
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("no pre-activation authority state bypasses backup evidence", () => {
  const root = fixture({
    database: { authorityRecordCount: 0, authority: null },
    backup: { status: "LOCAL_VERIFIED", remoteVerification: "FAILED" },
  });
  try {
    const result = run(root);
    assert.equal(result.status, 2);
    const report = JSON.parse(result.stdout);
    assert.equal(report.platformAuthorityState, "UNCONFIGURED");
    assert.equal(report.releaseReadiness, "NO_GO");
    assert.equal(report.bootstrapReadiness, "BLOCKED");
    assert.equal(report.mainFreezeReadiness, "NOT_READY");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("fails closed for incorrect migration head evidence", () => {
  const root = fixture({ database: { migrationHead: null } });
  try {
    const result = run(root);
    assert.equal(result.status, 2);
    assert.ok(
      JSON.parse(result.stdout).issues.includes("MIGRATION_STATE_INVALID"),
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("fails closed for missing rollback release evidence", () => {
  const root = fixture({ release: { images: {} } });
  try {
    const result = run(root);
    assert.equal(result.status, 2);
    assert.ok(
      JSON.parse(result.stdout).issues.includes("RELEASE_MANIFEST_INVALID"),
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("fails closed for stale backup and restore evidence", () => {
  const root = fixture({
    restore: { completedAt: "2020-01-01T00:00:00.000Z" },
  });
  fs.writeFileSync(
    path.join(root, "backup-state.json"),
    JSON.stringify({
      consecutiveFailures: 0,
      lastBackupId: "backup-1",
      lastSuccessAt: "2020-01-01T00:00:00.000Z",
    }),
  );
  try {
    const result = run(root);
    assert.equal(result.status, 2);
    const issues = JSON.parse(result.stdout).issues;
    assert.ok(issues.includes("REMOTE_BACKUP_STALE"));
    assert.ok(issues.includes("RESTORE_EVIDENCE_STALE"));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("fails closed for invalid restore checksum evidence", () => {
  const root = fixture({ restore: { verifiedSha256: "f".repeat(64) } });
  try {
    const result = run(root);
    assert.equal(result.status, 2);
    assert.ok(
      JSON.parse(result.stdout).issues.includes("RESTORE_EVIDENCE_INVALID"),
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("fails closed for invalid restore VersionId evidence", () => {
  const root = fixture({ restore: { remoteVersionId: null } });
  try {
    const result = run(root);
    assert.equal(result.status, 2);
    assert.ok(
      JSON.parse(result.stdout).issues.includes("RESTORE_EVIDENCE_INVALID"),
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("rejects an invalid relative restore report path", () => {
  const root = fixture();
  fs.writeFileSync(path.join(root, "latest-restore"), "1 relative.json");
  try {
    const result = run(root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /LATEST-RESTORE_PATH_INVALID/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("fails closed when durable release state disagrees with production", () => {
  const root = fixture({ releaseState: { migrationHead: "wrong" } });
  try {
    const result = run(root);
    assert.equal(result.status, 2);
    assert.ok(
      JSON.parse(result.stdout).issues.includes(
        "DURABLE_RELEASE_STATE_INVALID",
      ),
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("fails closed when the durable state has the wrong release manifest checksum", () => {
  const root = fixture({ releaseState: { manifestSha256: "f".repeat(64) } });
  try {
    const result = run(root);
    assert.equal(result.status, 2);
    assert.ok(
      JSON.parse(result.stdout).issues.includes(
        "DURABLE_RELEASE_STATE_INVALID",
      ),
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("fails closed when an application image digest is missing", () => {
  const root = fixture();
  fs.writeFileSync(
    path.join(root, "coro_frontend.image.json"),
    JSON.stringify({ RepoDigests: [] }),
  );
  try {
    const result = run(root);
    assert.equal(result.status, 2);
    const issues = JSON.parse(result.stdout).issues;
    assert.ok(issues.includes("IMMUTABLE_IMAGES_MISSING"));
    assert.ok(issues.includes("ACTIVE_RELEASE_IMAGE_MISMATCH"));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("rejects malformed inspection evidence instead of inventing a state", () => {
  const root = fixture();
  fs.writeFileSync(path.join(root, "database.json"), "{");
  try {
    const result = run(root);
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, "");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("reports UNCONFIGURED as ready for DRAFT but not ready for Main Freeze", () => {
  const root = fixture({
    database: { authorityRecordCount: 0, authority: null },
  });
  try {
    const result = run(root);
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.inspectionExecution, "PASS");
    assert.equal(report.platformAuthorityState, "UNCONFIGURED");
    assert.equal(report.releaseReadiness, "GO");
    assert.equal(report.bootstrapReadiness, "READY_FOR_DRAFT");
    assert.equal(report.mainFreezeReadiness, "NOT_READY");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("supports migration 137 without Platform Authority tables", () => {
  const root = fixture({
    sourceMigrations: migrations137,
    database: {
      migrationCount: 137,
      migrationHead: "20261023010000_rendement_financial_governance",
      migrationHistory: migrations137,
      platformAuthorityMigrationApplied: false,
      authorityTablePresent: false,
      grantTablePresent: false,
      authorityRecordCount: 0,
      authority: null,
    },
    release: {
      expectedMigrationHead: "20261023010000_rendement_financial_governance",
    },
    releaseState: {
      migrationHead: "20261023010000_rendement_financial_governance",
    },
  });
  try {
    const result = run(root);
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.schemaPhase, "PRE_PLATFORM_AUTHORITY");
    assert.equal(report.platformAuthorityState, "UNCONFIGURED");
    assert.equal(report.bootstrapReadiness, "READY_FOR_DRAFT");
    assert.equal(report.mainFreezeReadiness, "NOT_READY");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("supports governed migration 139 after Platform Authority", () => {
  const root = fixture({
    sourceMigrations: migrations139,
    database: {
      migrationCount: 139,
      migrationHead: "20261025010000_financial_platform_authority_alignment",
      migrationHistory: migrations139,
    },
    release: {
      expectedMigrationHead:
        "20261025010000_financial_platform_authority_alignment",
    },
    releaseState: {
      migrationHead: "20261025010000_financial_platform_authority_alignment",
    },
  });
  try {
    const result = run(root);
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.schemaPhase, "PLATFORM_AUTHORITY_AVAILABLE");
    assert.equal(report.platformAuthorityState, "ACTIVE");
    assert.equal(report.releaseReadiness, "GO");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("fails closed for migration 139 with missing Platform Authority tables", () => {
  const root = fixture({
    sourceMigrations: migrations139,
    database: {
      migrationCount: 139,
      migrationHead: "20261025010000_financial_platform_authority_alignment",
      migrationHistory: migrations139,
      authorityTablePresent: false,
      grantTablePresent: false,
    },
    release: {
      expectedMigrationHead:
        "20261025010000_financial_platform_authority_alignment",
    },
    releaseState: {
      migrationHead: "20261025010000_financial_platform_authority_alignment",
    },
  });
  try {
    const result = run(root);
    assert.equal(result.status, 2);
    const report = JSON.parse(result.stdout);
    assert.equal(report.schemaPhase, "INVALID");
    assert.ok(report.issues.includes("PLATFORM_SCHEMA_INCONSISTENT"));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("accepts rolled-back historical attempts when the active chain is intact", () => {
  const root = fixture({ database: { rolledBackMigrations: 1 } });
  try {
    const result = run(root);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).releaseReadiness, "GO");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("fails closed for a migration checksum mismatch", () => {
  const drifted = migrations138.map((entry, index) =>
    index === migrations138.length - 1
      ? { ...entry, checksum: "f".repeat(64) }
      : entry,
  );
  const root = fixture({ database: { migrationHistory: drifted } });
  try {
    const result = run(root);
    assert.equal(result.status, 2);
    const report = JSON.parse(result.stdout);
    assert.ok(report.issues.includes("MIGRATION_STATE_INVALID"));
    assert.ok(report.issues.includes("PLATFORM_SCHEMA_INCONSISTENT"));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("fails closed for an unknown migration absent from deployed source", () => {
  const unknown = migration("20990101000000_unknown", "9");
  const databaseMigrations = [...migrations138, unknown];
  const root = fixture({
    database: {
      migrationCount: 139,
      migrationHead: unknown.name,
      migrationHistory: databaseMigrations,
    },
    release: { expectedMigrationHead: unknown.name },
    releaseState: { migrationHead: unknown.name },
  });
  try {
    const result = run(root);
    assert.equal(result.status, 2);
    const report = JSON.parse(result.stdout);
    assert.ok(report.issues.includes("MIGRATION_STATE_INVALID"));
    assert.equal(report.schemaPhase, "INVALID");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

for (const [name, database] of [
  [
    "migration 138 with missing tables",
    { authorityTablePresent: false, grantTablePresent: false },
  ],
  [
    "migration 137 with unexpected tables",
    {
      migrationCount: 137,
      migrationHead: "20261023010000_rendement_financial_governance",
      platformAuthorityMigrationApplied: false,
      authorityTablePresent: true,
      grantTablePresent: true,
    },
  ],
  ["partially present authority schema", { grantTablePresent: false }],
  ["unknown migration head", { migrationHead: "20990101000000_unknown" }],
]) {
  test(`fails closed for ${name}`, () => {
    const root = fixture({ database });
    try {
      const result = run(root);
      assert.equal(result.status, 2);
      const report = JSON.parse(result.stdout);
      assert.equal(report.schemaPhase, "INVALID");
      assert.equal(report.platformAuthorityState, "INVALID");
      assert.ok(report.issues.includes("PLATFORM_SCHEMA_INCONSISTENT"));
      assert.equal(report.releaseReadiness, "NO_GO");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
}

test("fails closed for a failed migration", () => {
  const root = fixture({ database: { failedMigrations: 1 } });
  try {
    const result = run(root);
    assert.equal(result.status, 2);
    assert.ok(
      JSON.parse(result.stdout).issues.includes("MIGRATION_STATE_INVALID"),
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("reports a correctly bound DRAFT without treating it as ACTIVE", () => {
  const root = fixture({
    database: {
      authority: {
        id: "PRIMARY",
        status: "DRAFT",
        operatorOrganizationId: "operator",
        founderUserId: "founder",
        lockVersion: 7,
      },
    },
  });
  try {
    const result = run(root);
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.platformAuthorityState, "DRAFT");
    assert.equal(report.production.database.authority.lockVersion, 7);
    assert.equal(report.bootstrapReadiness, "DRAFT_PRESENT");
    assert.equal(report.mainFreezeReadiness, "NOT_READY");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("fails closed for invalid authority binding", () => {
  const root = fixture({
    database: {
      authority: {
        id: "PRIMARY",
        status: "DRAFT",
        operatorOrganizationId: "wrong-operator",
        founderUserId: "wrong-founder",
        lockVersion: 0,
      },
    },
  });
  try {
    const result = run(root);
    assert.equal(result.status, 2);
    const report = JSON.parse(result.stdout);
    const issues = report.issues;
    assert.ok(issues.includes("PLATFORM_AUTHORITY_INVALID"));
    assert.equal(report.platformAuthorityState, "INVALID");
    assert.equal(report.bootstrapReadiness, "BLOCKED");
    assert.equal(report.mainFreezeReadiness, "NOT_READY");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("reports missing authority evidence as NOT_VERIFIED and UNKNOWN", () => {
  const root = fixture();
  const database = JSON.parse(
    fs.readFileSync(path.join(root, "database.json"), "utf8"),
  );
  delete database.authority;
  fs.writeFileSync(path.join(root, "database.json"), JSON.stringify(database));
  try {
    const result = run(root);
    assert.equal(result.status, 2);
    const report = JSON.parse(result.stdout);
    assert.equal(report.platformAuthorityState, "NOT_VERIFIED");
    assert.equal(report.bootstrapReadiness, "UNKNOWN");
    assert.equal(report.mainFreezeReadiness, "UNKNOWN");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

for (const [name, database] of [
  ["duplicate canonical authority evidence", { authorityRecordCount: 2 }],
  [
    "an inconsistent missing authority",
    { authorityRecordCount: 1, authority: null },
  ],
  ["an inconsistent present authority", { authorityRecordCount: 0 }],
  [
    "a non-canonical authority identity",
    {
      authority: {
        id: "SECONDARY",
        status: "DRAFT",
        operatorOrganizationId: "operator",
        founderUserId: "founder",
        lockVersion: 0,
      },
    },
  ],
  [
    "a negative lockVersion",
    {
      authority: {
        id: "PRIMARY",
        status: "DRAFT",
        operatorOrganizationId: "operator",
        founderUserId: "founder",
        lockVersion: -1,
      },
    },
  ],
  [
    "a fractional lockVersion",
    {
      authority: {
        id: "PRIMARY",
        status: "DRAFT",
        operatorOrganizationId: "operator",
        founderUserId: "founder",
        lockVersion: 1.5,
      },
    },
  ],
  [
    "a textual lockVersion",
    {
      authority: {
        id: "PRIMARY",
        status: "DRAFT",
        operatorOrganizationId: "operator",
        founderUserId: "founder",
        lockVersion: "1",
      },
    },
  ],
]) {
  test(`fails closed for ${name}`, () => {
    const root = fixture({ database });
    try {
      const result = run(root);
      assert.equal(result.status, 2);
      const report = JSON.parse(result.stdout);
      assert.equal(report.platformAuthorityState, "INVALID");
      assert.ok(report.issues.includes("PLATFORM_AUTHORITY_INVALID"));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
}

test("fails closed for unexpected SUPER_ADMIN inventory", () => {
  const root = fixture({ database: { activeSuperAdminCount: 2 } });
  try {
    const result = run(root);
    assert.equal(result.status, 2);
    assert.ok(
      JSON.parse(result.stdout).issues.includes(
        "SUPER_ADMIN_INVENTORY_INVALID",
      ),
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("fails closed for an active platform grant assigned to a customer", () => {
  const root = fixture({ database: { activeCustomerGrantCount: 1 } });
  try {
    const result = run(root);
    assert.equal(result.status, 2);
    assert.ok(
      JSON.parse(result.stdout).issues.includes(
        "CUSTOMER_PLATFORM_GRANT_INVALID",
      ),
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("fails closed while a production deployment lock is held", () => {
  const root = fixture();
  fs.writeFileSync(
    path.join(root, "locks.json"),
    JSON.stringify({
      locks: [{ path: "/run/lock/coro-production-deployment.lock" }],
    }),
  );
  try {
    const result = run(root);
    assert.equal(result.status, 2);
    assert.ok(
      JSON.parse(result.stdout).issues.includes("DEPLOYMENT_LOCK_BUSY"),
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("collector contract rejects arbitrary commands and uses a read-only transaction", () => {
  const source = fs.readFileSync(
    new URL("./coro-production-inspect", import.meta.url),
    "utf8",
  );
  assert.match(source, /\$#.*-eq 1.*\$1.*--forced/);
  assert.match(source, /BEGIN READ ONLY/);
  assert.match(source, /ROLLBACK;/);
  assert.match(source, /to_regclass/);
  assert.match(source, /authority_schema_available/);
  assert.match(source, /'authorityRecordCount'/);
  assert.ok(source.includes("'lockVersion', \\\"lockVersion\\\""));
  assert.match(source, /\/opt\/coro-ops\/restore-drills/);
  assert.doesNotMatch(source, /\/opt\/coro-ops\/restores/);
  assert.match(source, /docker exec --env-file/);
  assert.equal(source.match(/--quiet --tuples-only --no-align/g)?.length, 2);
  assert.match(source, /migration_name='20261024010000_platform_authority'/);
  assert.match(source, /finished_at IS NULL AND rolled_back_at IS NULL/);
  assert.doesNotMatch(
    source,
    /finished_at IS NULL OR rolled_back_at IS NOT NULL/,
  );
  assert.match(source, /sha256sum --check --status/);
  assert.equal(source.match(/sort -nr \| sed -n '1p'/g)?.length, 2);
  assert.equal(source.match(/m\.status==="SUCCESS"/g)?.length, 1);
  assert.equal(
    source.match(/m\.state==="SUCCEEDED"&&m\.stage==="COMPLETED"/g)?.length,
    1,
  );
  assert.doesNotMatch(source, /sort -nr \| head -n 1/);
  assert.doesNotMatch(source, /docker exec -e PGPASSWORD/);
  assert.doesNotMatch(source, /env .*AWS_ACCESS_KEY_ID=/);
  assert.doesNotMatch(
    source,
    /docker (compose )?(up|down|restart)|migrate deploy|pg_restore|systemctl (start|stop|restart)/,
  );
});

test("unprivileged entrypoint accepts only the fixed inspect command", () => {
  const source = fs.readFileSync(
    new URL("./coro-production-inspection-entrypoint", import.meta.url),
    "utf8",
  );
  assert.match(source, /SSH_ORIGINAL_COMMAND:-.*!= 'inspect'/);
  assert.match(source, /coro-production-inspect --forced/);
  assert.doesNotMatch(source, /eval|sh -c|bash -c/);
});

test("workflow has no command input and uses the dedicated inspection identity", () => {
  const source = fs.readFileSync(
    new URL(
      "../../.github/workflows/production-inspection.yml",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(source, /workflow_dispatch:\s*\n\s*permissions:/);
  assert.match(source, /coro-inspector@\$INSPECTION_SERVER_IP/);
  assert.match(source, /StrictHostKeyChecking=yes/);
  assert.match(source, /INSPECTION_SSH_KNOWN_HOSTS/);
  assert.match(source, /platformAuthorityState/);
  assert.match(source, /schemaPhase/);
  assert.match(source, /mainFreezeReadiness/);
  assert.match(source, />"\$RUNNER_TEMP\/production-inspection-report\.json"/);
  assert.doesNotMatch(
    source,
    /username: root|production-release|docker compose/,
  );
});

test("maintenance workflow is pinned to two inspector files and has no remote command input", () => {
  const source = fs.readFileSync(
    new URL(
      "../../.github/workflows/production-inspector-maintenance.yml",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(source, /environment: production/);
  assert.match(
    source,
    /AUTHORIZED_SOURCE_SHA: d8e2e87a3ab605eb802bfcc4ba2efd2eca794720/,
  );
  assert.match(source, /uses: appleboy\/ssh-action@v1\.0\.3/);
  assert.match(source, /Validate pinned ECDSA host fingerprint/);
  assert.match(source, /HOST_FINGERPRINT:.*SERVER_SSH_ECDSA_HOST_FINGERPRINT/);
  assert.ok(
    source.includes('[[ "$HOST_FINGERPRINT" =~ ^SHA256:[A-Za-z0-9+/]{43}$ ]]'),
  );
  assert.match(source, /fingerprint:.*SERVER_SSH_ECDSA_HOST_FINGERPRINT/);
  assert.doesNotMatch(source, /SERVER_SSH_HOST_FINGERPRINT/);
  assert.doesNotMatch(
    source,
    /InsecureIgnoreHostKey|StrictHostKeyChecking=no|ssh-keyscan/,
  );
  assert.match(source, /UPDATE_PRODUCTION_INSPECTOR/);
  assert.match(
    source,
    /envs: AUTHORIZED_SOURCE_SHA,SOURCE_SHA,COLLECTOR_SHA256,REPORTER_SHA256,MAINTENANCE_RUN_ID/,
  );
  assert.ok(
    source.includes(
      '[[ "$SOURCE_SHA" == "$AUTHORIZED_SOURCE_SHA" ]] || fail SOURCE_SHA_INVALID',
    ),
  );
  assert.match(source, /coro-production-inspect/);
  assert.match(source, /inspection-report\.mjs/);
  assert.match(source, /BACKUP_ALREADY_EXISTS/);
  assert.match(
    source,
    /reporter_tmp="\$\{reporter%\.mjs\}\.tmp-\$\{MAINTENANCE_RUN_ID\}\.mjs"/,
  );
  assert.doesNotMatch(
    source,
    /reporter_tmp="\$\{reporter\}\.tmp-\$\{MAINTENANCE_RUN_ID\}"/,
  );
  assert.match(source, /mv -T/);
  assert.match(source, /root:root:755/);
  assert.match(source, /root:root:644/);
  assert.doesNotMatch(
    source,
    /migrate deploy|docker compose (up|down|restart)/,
  );
  assert.doesNotMatch(source, /command:.*inputs|script:.*inputs/);
});
