import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { startProviderCapture } from "../src/provider-capture.mjs";
import { startPrivateStorage } from "../src/private-storage.mjs";

test("provider capture redacts secrets and injects deterministic failures", async () => {
  const dir = await mkdtemp("D:\\CORO-QA\\provider-test-");
  const output = join(dir, "events.ndjson");
  const capture = await startProviderCapture({ port: 0, output });
  try {
    let result = await fetch(`${capture.url}/email`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "secret", value: "safe" }),
    });
    assert.equal(result.status, 202);
    result = await fetch(`${capture.url}/email`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-qa-failure": "true" },
      body: "{}",
    });
    assert.equal(result.status, 503);
    const logged = await readFile(output, "utf8");
    assert.match(logged, /\[REDACTED\]/);
    assert.doesNotMatch(logged, /"password":"secret"/);
  } finally {
    await capture.close();
  }
});

test("private storage requires authentication, tenant prefix and immutability", async () => {
  const storage = await startPrivateStorage({ port: 0 });
  try {
    let result = await fetch(`${storage.url}/bucket/tenant-a/a.pdf`);
    assert.equal(result.status, 403);
    const headers = {
      authorization: "AWS4-HMAC-SHA256 Credential=qa-storage-access/scope",
    };
    result = await fetch(`${storage.url}/bucket/public.pdf`, {
      method: "PUT",
      headers,
      body: "x",
    });
    assert.equal(result.status, 403);
    result = await fetch(`${storage.url}/bucket/tenant-a/a.pdf`, {
      method: "PUT",
      headers,
      body: "x",
    });
    assert.equal(result.status, 200);
    result = await fetch(`${storage.url}/bucket/tenant-a/a.pdf`, {
      method: "PUT",
      headers,
      body: "y",
    });
    assert.equal(result.status, 409);
  } finally {
    await storage.close();
  }
});
