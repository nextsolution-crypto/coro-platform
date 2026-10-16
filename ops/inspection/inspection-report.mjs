import fs from "node:fs";
import path from "node:path";

const root = process.argv[2];
if (!root || process.argv.length !== 3)
  throw new Error("EVIDENCE_DIRECTORY_REQUIRED");

const read = (name) => fs.readFileSync(path.join(root, name), "utf8").trim();
const json = (name) => JSON.parse(read(name));
const nullableLatest = (name) => {
  const line = read(name);
  if (!line) return null;
  const separator = line.indexOf(" ");
  const file = line.slice(separator + 1);
  if (!path.isAbsolute(file))
    throw new Error(`${name.toUpperCase()}_PATH_INVALID`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
};
const container = (name) => {
  const value = json(`${name}.json`);
  const image = json(`${name}.image.json`);
  return {
    running: value.State?.Running === true,
    health: value.State?.Health?.Status ?? null,
    restartCount: value.RestartCount,
    imageDigest: Array.isArray(image.RepoDigests)
      ? (image.RepoDigests[0] ?? null)
      : null,
    imageId: value.Image ?? null,
  };
};

const db = json("database.json");
const backupState = json("backup-state.json");
const backup = nullableLatest("latest-backup");
const remoteHead = json("remote-head.json");
const restore = nullableLatest("latest-restore");
const release = nullableLatest("latest-release");
const releaseState = nullableLatest("latest-release-state");
const rollbackAvailableCount = Number(read("rollback-available-count"));
const containers = Object.fromEntries(
  [
    "coro_backend",
    "coro_frontend",
    "coro_client_portal",
    "coro_website",
    "coro_postgres",
  ].map((name) => [name, container(name)]),
);
const issues = [];
const now = Date.now();
const ageHours = (value) => {
  const timestamp = Date.parse(value ?? "");
  return Number.isFinite(timestamp) ? (now - timestamp) / 3_600_000 : Infinity;
};
const isCurrentWithinHours = (value, maximum) => {
  const age = ageHours(value);
  return age >= 0 && age <= maximum;
};
const authorityBindingMatches =
  db.authority?.operatorOrganizationId === db.operator?.id &&
  db.authority?.founderUserId === db.founder?.id &&
  db.founder?.organizationId === db.operator?.id;
const prePlatformAuthorityHead =
  db.migrationHead === "20261023010000_rendement_financial_governance";
const platformAuthorityHead =
  db.migrationHead === "20261024010000_platform_authority";
const authorityTablesPresent =
  db.authorityTablePresent === true && db.grantTablePresent === true;
const authorityTablesAbsent =
  db.authorityTablePresent === false && db.grantTablePresent === false;
const schemaPhase =
  prePlatformAuthorityHead &&
  db.platformAuthorityMigrationApplied === false &&
  authorityTablesAbsent
    ? "PRE_PLATFORM_AUTHORITY"
    : platformAuthorityHead &&
        db.platformAuthorityMigrationApplied === true &&
        authorityTablesPresent
      ? "PLATFORM_AUTHORITY_AVAILABLE"
      : "INVALID";
const platformAuthorityState =
  schemaPhase === "INVALID"
    ? "INVALID"
    : !Object.hasOwn(db, "authority")
      ? "NOT_VERIFIED"
      : db.authority === null
        ? "UNCONFIGURED"
        : ["DRAFT", "ACTIVE"].includes(db.authority?.status) &&
            authorityBindingMatches
          ? db.authority.status
          : "INVALID";

if (
  !Object.values(containers).every(
    (item) =>
      item.running &&
      item.restartCount === 0 &&
      (item.health === null || item.health === "healthy"),
  )
)
  issues.push("CONTAINER_HEALTH_INVALID");
if (
  ![
    "coro_backend",
    "coro_frontend",
    "coro_client_portal",
    "coro_website",
  ].every((name) =>
    /^.+@sha256:[0-9a-f]{64}$/.test(containers[name].imageDigest ?? ""),
  )
)
  issues.push("IMMUTABLE_IMAGES_MISSING");
if (
  !Number.isInteger(db.migrationCount) ||
  !db.migrationHead ||
  Number(db.failedMigrations) !== 0
)
  issues.push("MIGRATION_STATE_INVALID");
if (schemaPhase === "INVALID") issues.push("PLATFORM_SCHEMA_INCONSISTENT");
if (!db.operator?.exists || !db.operator.active || !db.operator.internal)
  issues.push("OPERATOR_IDENTITY_INVALID");
if (
  !db.founder?.exists ||
  !db.founder.active ||
  db.founder.role !== "SUPER_ADMIN"
)
  issues.push("FOUNDER_IDENTITY_INVALID");
if (db.activeSuperAdminCount !== 1 || db.customerSuperAdminCount !== 0)
  issues.push("SUPER_ADMIN_INVENTORY_INVALID");
if (["INVALID", "NOT_VERIFIED"].includes(platformAuthorityState))
  issues.push("PLATFORM_AUTHORITY_INVALID");
if (db.activeCustomerGrantCount !== 0)
  issues.push("CUSTOMER_PLATFORM_GRANT_INVALID");
const remoteSha = String(remoteHead.Metadata?.sha256 ?? "").toLowerCase();
if (
  !backup ||
  backup.status !== "REMOTE_VERIFIED" ||
  backup.remoteVerification !== "PASSED" ||
  !/^[a-f0-9]{64}$/.test(backup.sha256 ?? "") ||
  remoteSha !== backup.sha256 ||
  !remoteHead.VersionId ||
  remoteHead.VersionId === "null" ||
  backupState.lastBackupId !== backup.backupId ||
  backupState.consecutiveFailures !== 0
)
  issues.push("REMOTE_BACKUP_INVALID");
if (!isCurrentWithinHours(backupState.lastSuccessAt, 8))
  issues.push("REMOTE_BACKUP_STALE");
if (
  !restore ||
  restore.status !== "RESTORE_VERIFIED" ||
  !/^[a-f0-9]{64}$/.test(restore.expectedSha256 ?? "") ||
  restore.verifiedSha256 !== restore.expectedSha256 ||
  !restore.remoteVersionId ||
  restore.remoteVersionId === "null"
)
  issues.push("RESTORE_EVIDENCE_INVALID");
if (!isCurrentWithinHours(restore?.completedAt, 45 * 24))
  issues.push("RESTORE_EVIDENCE_STALE");
if (
  !release ||
  release.status !== "SUCCESS" ||
  !release.gitCommit ||
  !release.images ||
  Object.keys(release.images).length !== 4 ||
  !Array.isArray(release.previousImages) ||
  release.previousImages.filter(Boolean).length !== 4 ||
  rollbackAvailableCount !== 4
)
  issues.push("RELEASE_MANIFEST_INVALID");
if (
  release?.gitCommit !== read("commit") ||
  release?.expectedMigrationHead !== db.migrationHead
)
  issues.push("RELEASE_RUNTIME_PROVENANCE_MISMATCH");

const activeApplicationImages = {
  backend: containers.coro_backend.imageDigest,
  frontend: containers.coro_frontend.imageDigest,
  clientPortal: containers.coro_client_portal.imageDigest,
  website: containers.coro_website.imageDigest,
};
const releaseImages = release?.images ? Object.values(release.images) : [];
if (JSON.stringify(activeApplicationImages) !== JSON.stringify(release?.images))
  issues.push("ACTIVE_RELEASE_IMAGE_MISMATCH");
if (
  !releaseState ||
  releaseState.state !== "SUCCEEDED" ||
  releaseState.stage !== "COMPLETED" ||
  releaseState.releaseId !== release?.releaseId ||
  releaseState.gitCommit !== release?.gitCommit ||
  releaseState.manifestSha256 !== read("release-manifest-sha256") ||
  releaseState.migrationHead !== db.migrationHead ||
  JSON.stringify(releaseState.images ?? []) !== JSON.stringify(releaseImages)
)
  issues.push("DURABLE_RELEASE_STATE_INVALID");

const lockData = json("locks.json");
const deploymentLockBusy =
  Array.isArray(lockData.locks) &&
  lockData.locks.some(
    (entry) => entry.path === "/run/lock/coro-production-deployment.lock",
  );
if (deploymentLockBusy) issues.push("DEPLOYMENT_LOCK_BUSY");

const inspectionExecution = "PASS";
const releaseReadiness = issues.length ? "NO_GO" : "GO";
const bootstrapReadiness = issues.length
  ? platformAuthorityState === "NOT_VERIFIED"
    ? "UNKNOWN"
    : "BLOCKED"
  : ({
      UNCONFIGURED: "READY_FOR_DRAFT",
      DRAFT: "DRAFT_PRESENT",
      ACTIVE: "ALREADY_ACTIVE",
    }[platformAuthorityState] ?? "BLOCKED");
const mainFreezeReadiness =
  platformAuthorityState === "NOT_VERIFIED"
    ? "UNKNOWN"
    : platformAuthorityState === "ACTIVE" && issues.length === 0
      ? "READY"
      : "NOT_READY";

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  assessment: releaseReadiness,
  inspectionExecution,
  platformAuthorityState,
  schemaPhase,
  releaseReadiness,
  bootstrapReadiness,
  mainFreezeReadiness,
  issues,
  production: {
    commit: read("commit"),
    composeSha256: read("compose-sha256"),
    containers,
    database: db,
    deploymentLockBusy,
    disk: read("disk").split("\n").slice(-1)[0],
    backup: backup
      ? {
          backupId: backup.backupId,
          status: backup.status,
          sha256: backup.sha256,
          versionId: remoteHead.VersionId,
          remoteSha256Verified: remoteSha === backup.sha256,
        }
      : null,
    restore: restore
      ? {
          restoreId: restore.restoreId ?? null,
          status: restore.status,
          completedAt: restore.completedAt ?? null,
        }
      : null,
    release: release
      ? {
          releaseId: release.releaseId,
          gitCommit: release.gitCommit,
          status: release.status,
          expectedMigrationHead: release.expectedMigrationHead,
          rollbackImagesAvailable: rollbackAvailableCount,
        }
      : null,
    releaseState: releaseState
      ? {
          releaseId: releaseState.releaseId,
          state: releaseState.state,
          stage: releaseState.stage,
          gitCommit: releaseState.gitCommit,
          migrationHead: releaseState.migrationHead,
        }
      : null,
    systemd: read("systemd"),
  },
};

const serialized = JSON.stringify(report);
if (/password|secret|token|access[_-]?key|private[_-]?key/i.test(serialized))
  throw new Error("REPORT_SECRET_PATTERN_DETECTED");
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (issues.length) process.exitCode = 2;
