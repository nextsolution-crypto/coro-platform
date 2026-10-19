import test from "node:test";
import assert from "node:assert/strict";
import {
  assertLocalUrl,
  assertSafeEnvironment,
  assertUnderQaRoot,
  redact,
} from "../src/policy.mjs";

test("accepts isolated loopback URLs", () =>
  assert.equal(
    assertLocalUrl("http://127.0.0.1:34640/api").hostname,
    "127.0.0.1",
  ));
test("rejects production and non-loopback URLs", () => {
  assert.throws(() => assertLocalUrl("https://app.getcoro.io/api"));
  assert.throws(() => assertLocalUrl("http://localhost:3002/api"));
});
test("rejects production credentials", () =>
  assert.throws(() => assertSafeEnvironment({ BREVO_API_KEY: "present" })));
test("confines artifacts to D QA root", () => {
  assert.doesNotThrow(() => assertUnderQaRoot("D:\\CORO-QA\\runs\\x"));
  assert.throws(() => assertUnderQaRoot("D:\\outside"));
});
test("redacts nested sensitive values", () =>
  assert.deepEqual(redact({ token: "x", nested: { password: "y", ok: 1 } }), {
    token: "[REDACTED]",
    nested: { password: "[REDACTED]", ok: 1 },
  }));
