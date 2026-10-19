import test from "node:test";
import assert from "node:assert/strict";
import { assertDisposableDatabase } from "../src/database-policy.mjs";

test("accepts named disposable PostgreSQL on isolated port", () =>
  assert.equal(
    assertDisposableDatabase(
      "postgresql://qa:x@127.0.0.1:55439/coro_qa_global_e2e",
    ).port,
    "55439",
  ));
test("rejects production-shaped database targets", () => {
  assert.throws(() =>
    assertDisposableDatabase("postgresql://qa:x@db.example.com:5432/coro"),
  );
  assert.throws(() =>
    assertDisposableDatabase(
      "postgresql://qa:x@127.0.0.1:5432/coro_qa_global_e2e",
    ),
  );
  assert.throws(() =>
    assertDisposableDatabase("postgresql://qa:x@127.0.0.1:55439/coro"),
  );
});
