import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { psqlArguments, validateRecoveryCase } from "./recovery-case.mjs";

const now = new Date("2026-10-16T20:00:00-04:00");
const id = (digit) =>
  `${digit.repeat(8)}-${digit.repeat(4)}-4${digit.repeat(3)}-8${digit.repeat(3)}-${digit.repeat(12)}`;
const valid = () => ({
  schemaVersion: 1,
  incidentId: id("1"),
  incidentCategory: "AUTHORITY_BINDING_INCONSISTENCY",
  operation: "RESTORE_FOUNDER_STATUS",
  authorizationReference: "INC-2026-0001",
  operatorReference: "operator:security-duty",
  authorizingUserId: id("2"),
  expectedFounderUserId: id("3"),
  expectedOperatorOrganizationId: id("4"),
  targetFounderUserId: id("3"),
  targetOperatorOrganizationId: id("4"),
  expectedLockVersion: 1,
  reason: "Approved recovery of canonical Founder authority",
  expiresAt: "2026-10-17T00:20:00.000Z",
  approvers: ["founder:verified-out-of-band"],
  singleFounderException: true,
  compensatingControls: [
    "PINNED_SCRIPT_SHA256",
    "READ_ONLY_BEFORE_EVIDENCE",
    "APPEND_ONLY_DATABASE_AUDIT",
    "EXTERNAL_AFTER_EVIDENCE",
  ],
});

test("accepts a narrow time-limited single-Founder recovery case", () => {
  assert.equal(
    validateRecoveryCase(valid(), now).operation,
    "RESTORE_FOUNDER_STATUS",
  );
});
test("rejects compromised-Founder and lost-MFA recovery", () => {
  for (const incidentCategory of ["COMPROMISED_FOUNDER", "LOST_MFA"])
    assert.throws(
      () => validateRecoveryCase({ ...valid(), incidentCategory }, now),
      /identity incident procedure/,
    );
});
test("rejects expired, stale, unauthorized and arbitrary operations", () => {
  assert.throws(
    () =>
      validateRecoveryCase({ ...valid(), expiresAt: now.toISOString() }, now),
    /expire/,
  );
  assert.throws(
    () => validateRecoveryCase({ ...valid(), expectedLockVersion: -1 }, now),
    /expectedLockVersion/,
  );
  assert.throws(
    () => validateRecoveryCase({ ...valid(), approvers: [] }, now),
    /approver/,
  );
  assert.throws(
    () => validateRecoveryCase({ ...valid(), operation: "ARBITRARY_SQL" }, now),
    /not permitted/,
  );
});
test("requires every single-Founder compensating control", () => {
  assert.throws(
    () => validateRecoveryCase({ ...valid(), compensatingControls: [] }, now),
    /missing compensating control/,
  );
});
test("psql invocation is fixed and carries no arbitrary SQL", () => {
  const args = psqlArguments(validateRecoveryCase(valid(), now), true);
  assert.equal(args.includes("-c"), false);
  assert.equal(args.at(-2), "-f");
  assert.match(args.at(-1), /recover\.sql$/);
});

test("SQL recovery remains allow-listed, locked, audited and grant-free", () => {
  const sql = fs.readFileSync(
    fileURLToPath(new URL("./recover.sql", import.meta.url)),
    "utf8",
  );

  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /PLATFORM_AUTHORITY_FOUNDER_RECOVERY/);
  assert.match(sql, /PlatformAuthorityConfiguration_protect/);
  assert.doesNotMatch(sql, /session_replication_role/i);
  assert.doesNotMatch(sql, /INSERT\s+INTO\s+"PlatformPermissionGrant"/i);
  assert.doesNotMatch(sql, /UPDATE\s+"PlatformPermissionGrant"/i);
  assert.doesNotMatch(sql, /DELETE\s+FROM\s+"PlatformPermissionGrant"/i);
});
