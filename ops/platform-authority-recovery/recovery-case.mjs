#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REFERENCE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{7,127}$/;
const OPERATIONS = new Set([
  "RESTORE_FOUNDER_STATUS",
  "RESTORE_OPERATOR_STATUS",
  "REBIND_FOUNDER",
  "REBIND_OPERATOR",
]);
const IDENTITY_INCIDENTS = new Set(["COMPROMISED_FOUNDER", "LOST_MFA"]);
const SINGLE_FOUNDER_CONTROLS = [
  "PINNED_SCRIPT_SHA256",
  "READ_ONLY_BEFORE_EVIDENCE",
  "APPEND_ONLY_DATABASE_AUDIT",
  "EXTERNAL_AFTER_EVIDENCE",
];

export function validateRecoveryCase(input, now = new Date()) {
  const errors = [];
  if (input?.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  for (const field of [
    "incidentId",
    "authorizingUserId",
    "expectedFounderUserId",
    "expectedOperatorOrganizationId",
    "targetFounderUserId",
    "targetOperatorOrganizationId",
  ]) {
    if (!UUID.test(input?.[field] ?? ""))
      errors.push(`${field} must be a UUID`);
  }
  if (!OPERATIONS.has(input?.operation))
    errors.push("operation is not permitted");
  if (IDENTITY_INCIDENTS.has(input?.incidentCategory))
    errors.push(
      "compromised credentials and lost MFA require the identity incident procedure",
    );
  if (!REFERENCE.test(input?.authorizationReference ?? ""))
    errors.push("authorizationReference is invalid");
  if (!REFERENCE.test(input?.operatorReference ?? ""))
    errors.push("operatorReference is invalid");
  if (
    typeof input?.reason !== "string" ||
    input.reason.trim().length < 20 ||
    input.reason.length > 500
  )
    errors.push("reason must contain 20 to 500 characters");
  if (
    !Number.isSafeInteger(input?.expectedLockVersion) ||
    input.expectedLockVersion < 0
  )
    errors.push("expectedLockVersion must be a non-negative integer");
  const expiresAt = new Date(input?.expiresAt ?? "invalid");
  const lifetime = expiresAt.getTime() - now.getTime();
  if (
    !Number.isFinite(expiresAt.getTime()) ||
    lifetime <= 0 ||
    lifetime > 30 * 60_000
  )
    errors.push("approval must expire within 30 minutes and still be valid");
  const approvers = Array.isArray(input?.approvers) ? input.approvers : [];
  if (!approvers.length || approvers.some((value) => !REFERENCE.test(value)))
    errors.push("at least one valid approver reference is required");
  if (approvers.length === 1) {
    if (input?.singleFounderException !== true)
      errors.push("single-Founder exception must be explicit");
    const controls = new Set(input?.compensatingControls ?? []);
    for (const control of SINGLE_FOUNDER_CONTROLS)
      if (!controls.has(control))
        errors.push(`missing compensating control: ${control}`);
  } else if (input?.singleFounderException === true) {
    errors.push(
      "single-Founder exception is inconsistent with multiple approvers",
    );
  }
  if (errors.length) throw new Error(errors.join("; "));
  return Object.freeze({
    ...input,
    reason: input.reason.trim(),
    expiresAt: expiresAt.toISOString(),
  });
}

export function psqlArguments(recoveryCase, apply) {
  const sql = fileURLToPath(new URL("./recover.sql", import.meta.url));
  const pairs = {
    operation: recoveryCase.operation,
    incident_id: recoveryCase.incidentId,
    authorization_reference: recoveryCase.authorizationReference,
    operator_reference: recoveryCase.operatorReference,
    authorizing_user_id: recoveryCase.authorizingUserId,
    expected_founder_user_id: recoveryCase.expectedFounderUserId,
    expected_operator_organization_id:
      recoveryCase.expectedOperatorOrganizationId,
    target_founder_user_id: recoveryCase.targetFounderUserId,
    target_operator_organization_id: recoveryCase.targetOperatorOrganizationId,
    expected_lock_version: String(recoveryCase.expectedLockVersion),
    reason: recoveryCase.reason,
    approval_expires_at: recoveryCase.expiresAt,
    apply: apply ? "true" : "false",
  };
  return [
    "-X",
    "-v",
    "ON_ERROR_STOP=1",
    ...Object.entries(pairs).flatMap(([key, value]) => [
      "-v",
      `${key}=${value}`,
    ]),
    "-f",
    sql,
  ];
}

function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const casePath = args.find((arg) => !arg.startsWith("--"));
  if (!casePath)
    throw new Error("usage: recovery-case.mjs <approved-case.json> [--apply]");
  if (process.env.CORO_RECOVERY_WINDOW !== "OPEN")
    throw new Error("time-limited recovery window is not OPEN");
  const recoveryCase = validateRecoveryCase(
    JSON.parse(fs.readFileSync(path.resolve(casePath), "utf8")),
  );
  if (!apply) {
    process.stdout.write(
      JSON.stringify({
        outcome: "VALIDATED_DRY_RUN",
        operation: recoveryCase.operation,
        incidentId: recoveryCase.incidentId,
      }) + "\n",
    );
    return;
  }
  if (process.env.CORO_RECOVERY_APPLY !== recoveryCase.authorizationReference)
    throw new Error("apply confirmation does not match authorizationReference");
  const result = spawnSync(
    process.env.PSQL_BIN || "psql",
    psqlArguments(recoveryCase, true),
    {
      stdio: "inherit",
      env: process.env,
    },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main();
