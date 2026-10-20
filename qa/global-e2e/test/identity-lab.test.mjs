import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { identityCatalogue, actor } from "../src/identity-catalogue.mjs";
import { startMfaCaptureAdapter } from "../src/mfa-capture-adapter.mjs";

const root = "D:\\CORO-QA\\runs\\identity-lab-tests";
const capture = join(root, "capture");
const token = "identity-lab-test-channel-token-123456789";

test("catalogue defines nine isolated synthetic identities", () => {
  assert.equal(Object.keys(identityCatalogue).length, 9);
  assert.equal(actor("clientCorporateA").role, "CLIENT_CORPORATE");
  assert.equal(actor("clientWithoutBuildings").scope, "NONE");
  assert.equal(actor("revokedUser").active, false);
  assert.notEqual(actor("clientCorporateA").tenant, actor("clientOrganizationB").tenant);
});

test("protected MFA adapter consumes a challenge once and never exposes it without authorization", async () => {
  await rm(root, { recursive: true, force: true });
  await mkdir(capture, { recursive: true });
  await writeFile(
    join(capture, "challenge.json"),
    JSON.stringify({
      to: "founder@global-e2e.test",
      subject: "123456 — CORO QA",
      capturedAt: new Date().toISOString(),
    }),
    { mode: 0o600 },
  );
  const adapter = await startMfaCaptureAdapter({ captureDirectory: capture, channelToken: token, port: 34644 });
  try {
    let response = await fetch(`${adapter.url}/challenge?recipient=founder%40global-e2e.test&after=${Date.now() - 1000}`);
    assert.equal(response.status, 401);
    response = await fetch(`${adapter.url}/challenge?recipient=founder%40global-e2e.test&after=${Date.now() - 1000}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).code, "123456");
    response = await fetch(`${adapter.url}/challenge?recipient=founder%40global-e2e.test&after=${Date.now() - 1000}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(response.status, 404);
  } finally {
    await adapter.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("MFA adapter rejects non-synthetic recipients", async () => {
  await mkdir(capture, { recursive: true });
  const adapter = await startMfaCaptureAdapter({ captureDirectory: capture, channelToken: token, port: 34645 });
  try {
    const response = await fetch(`${adapter.url}/challenge?recipient=user%40example.com&after=0`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(response.status, 400);
  } finally {
    await adapter.close();
    await rm(root, { recursive: true, force: true });
  }
});
