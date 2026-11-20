import assert from "node:assert/strict";
import test from "node:test";
import { interpretPanicResponse, requestPanic, panicFailureCode } from "./panicOutcome.ts";

function fakeFetch(status: number, body: unknown, options: { throwJson?: boolean } = {}) {
  return async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (options.throwJson) throw new Error("invalid json");
      return body;
    },
  });
}

const base = { apiUrl: "https://api.test/api", buildingId: "b-1", token: "t", payload: {} };

test("success only when the server confirms at least one contact", async () => {
  const outcome = await requestPanic({ ...base, fetchImpl: fakeFetch(200, { notifiedCount: 2, address: "1 rue Test" }) });
  assert.deepEqual(outcome, { kind: "CONFIRMED", notifiedCount: 2, address: "1 rue Test" });
});

test("zero contact is never presented as a success", async () => {
  const outcome = await requestPanic({ ...base, fetchImpl: fakeFetch(200, { notifiedCount: 0 }) });
  assert.equal(outcome.kind, "UNCONFIRMED");
  assert.equal(outcome.kind === "UNCONFIRMED" && outcome.reason, "NO_CONTACT");
});

test("HTTP errors are unconfirmed with a distinct reason", async () => {
  for (const [status, reason] of [[401, "SESSION"], [403, "FORBIDDEN"], [404, "NOT_FOUND"], [500, "SERVER"], [502, "SERVER"]] as const) {
    const outcome = await requestPanic({ ...base, fetchImpl: fakeFetch(status, { message: "x" }) });
    assert.deepEqual(outcome, { kind: "UNCONFIRMED", reason, status });
  }
});

test("missing, malformed or unreadable bodies are unconfirmed", async () => {
  assert.equal(interpretPanicResponse(200, true, null).kind, "UNCONFIRMED");
  assert.equal(interpretPanicResponse(200, true, { notifiedCount: "2" }).kind, "UNCONFIRMED");
  assert.equal(interpretPanicResponse(200, true, { success: true }).kind, "UNCONFIRMED");
  assert.equal(interpretPanicResponse(200, true, { notifiedCount: 1.5 }).kind, "UNCONFIRMED");
  const unreadable = await requestPanic({ ...base, fetchImpl: fakeFetch(200, null, { throwJson: true }) });
  assert.deepEqual(unreadable, { kind: "UNCONFIRMED", reason: "INVALID_RESPONSE", status: 200 });
});

test("network failure is unconfirmed", async () => {
  const outcome = await requestPanic({
    ...base,
    fetchImpl: async () => {
      throw new TypeError("Failed to fetch");
    },
  });
  assert.deepEqual(outcome, { kind: "UNCONFIRMED", reason: "NETWORK", status: null });
});

test("a request that never answers is aborted and unconfirmed", async () => {
  const outcome = await requestPanic({
    ...base,
    timeoutMs: 20,
    fetchImpl: (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      }),
  });
  assert.deepEqual(outcome, { kind: "UNCONFIRMED", reason: "TIMEOUT", status: null });
});

test("no session token means no request and an unconfirmed outcome", async () => {
  let called = false;
  const outcome = await requestPanic({
    ...base,
    token: null,
    fetchImpl: async () => {
      called = true;
      return { ok: true, status: 200, json: async () => ({ notifiedCount: 3 }) };
    },
  });
  assert.equal(called, false);
  assert.deepEqual(outcome, { kind: "UNCONFIRMED", reason: "SESSION", status: null });
});

test("failure code is short and readable", () => {
  assert.equal(panicFailureCode({ kind: "UNCONFIRMED", reason: "FORBIDDEN", status: 403 }), "FORBIDDEN · HTTP 403");
  assert.equal(panicFailureCode({ kind: "UNCONFIRMED", reason: "TIMEOUT", status: null }), "TIMEOUT");
});
