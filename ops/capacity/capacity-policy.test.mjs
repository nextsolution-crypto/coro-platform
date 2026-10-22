import assert from "node:assert/strict";
import test from "node:test";
import { evaluateCapacity } from "./capacity-policy.mjs";

const GiB = 1024 ** 3;
const fixture = (freeBytes) => ({
  filesystem: { totalBytes: 50 * GiB, freeBytes },
  requirements: { backupBytes: 5 * GiB, nextImageSetBytes: 4 * GiB, databaseGrowthBytes: 2 * GiB },
});

test("release gate includes backup, extraction, database growth and reserve", () => {
  const result = evaluateCapacity(fixture(18 * GiB));
  assert.equal(result.releaseRequiredBytes, 17 * GiB);
  assert.equal(result.releaseReady, true);
  assert.equal(result.backupReady, true);
});

test("backup threshold is never weakened by release policy", () => {
  const result = evaluateCapacity(fixture(4 * GiB));
  assert.equal(result.backupReady, false);
  assert.equal(result.releaseReady, false);
  assert.equal(result.status, "CRITICAL");
});

test("warning state is reported before backup becomes unsafe", () => {
  const result = evaluateCapacity(fixture(8 * GiB));
  assert.equal(result.backupReady, true);
  assert.equal(result.releaseReady, false);
  assert.equal(result.status, "WARNING");
});
