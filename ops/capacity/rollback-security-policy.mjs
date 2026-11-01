import fs from "node:fs";

const IMAGE = /^ghcr\.io\/[a-z0-9_.-]+\/[a-z0-9_.-]+@sha256:[0-9a-f]{64}$/;
const COMMIT = /^[0-9a-f]{40}$/;
const MIGRATION = /^[0-9]{14}_[a-z0-9_]+$/;

export function validateRollbackSecurity({ manifest, policy, runtime }) {
  if (policy?.schemaVersion !== 1) throw new Error("ROLLBACK_SECURITY_POLICY_INVALID");
  const images = (manifest?.previousImages || []).filter(Boolean);
  if (images.length !== 4 || !images.every((image) => IMAGE.test(image)) || new Set(images).size !== 4) {
    throw new Error("ROLLBACK_SECURITY_IMAGE_SET_INVALID");
  }
  if (!COMMIT.test(manifest?.previousCommit || "")) throw new Error("ROLLBACK_SECURITY_COMMIT_INVALID");
  if (!MIGRATION.test(manifest?.previousMigrationHead || "") || !MIGRATION.test(runtime?.migrationHead || "")) {
    throw new Error("ROLLBACK_SECURITY_MIGRATION_INVALID");
  }

  const blocked = new Set(policy.blockedRollbackImages || []);
  if (images.some((image) => blocked.has(image))) throw new Error("ROLLBACK_SECURITY_IMAGE_BLOCKED");

  const approval = (policy.approvedRollbackSets || []).find(
    (entry) => entry.previousCommit === manifest.previousCommit,
  );
  if (!approval) throw new Error("ROLLBACK_SECURITY_APPROVAL_MISSING");
  if (!Array.isArray(approval.images) || approval.images.length !== 4 || images.some((image) => !approval.images.includes(image))) {
    throw new Error("ROLLBACK_SECURITY_APPROVAL_IMAGES_MISMATCH");
  }
  if (!Array.isArray(approval.compatibleDatabaseHeads) || !approval.compatibleDatabaseHeads.includes(runtime.migrationHead)) {
    throw new Error("ROLLBACK_SECURITY_SCHEMA_INCOMPATIBLE");
  }
  if (!Array.isArray(approval.requiredKeyIds) || approval.requiredKeyIds.some((keyId) => !runtime.availableKeyIds?.includes(keyId))) {
    throw new Error("ROLLBACK_SECURITY_KEY_UNAVAILABLE");
  }
  if (!['PREFLIGHT', 'EXECUTION'].includes(runtime?.phase)) throw new Error("ROLLBACK_SECURITY_PHASE_INVALID");
  if (approval.workerCompatibility !== "COMPATIBLE") {
    throw new Error("ROLLBACK_SECURITY_WORKER_UNSAFE");
  }
  if (runtime.phase === 'EXECUTION' && runtime.workerState !== "QUIESCED") throw new Error("ROLLBACK_SECURITY_WORKER_UNSAFE");
  if (!approval.reviewedAt || !approval.reason || approval.status !== "APPROVED") {
    throw new Error("ROLLBACK_SECURITY_APPROVAL_INVALID");
  }

  return {
    previousCommit: manifest.previousCommit,
    images,
    previousMigrationHead: manifest.previousMigrationHead,
    currentMigrationHead: runtime.migrationHead,
    approvalId: approval.id,
    phase: runtime.phase,
  };
}
if (process.argv[1] && import.meta.url === new URL(`file:${process.argv[1]}`).href) {
  const input = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
  process.stdout.write(`${JSON.stringify(validateRollbackSecurity(input), null, 2)}\n`);
}
