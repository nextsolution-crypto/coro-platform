import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const compose = await readFile(
  new URL("../docker-compose.qa.yml", import.meta.url),
  "utf8",
);

test("uses an internal Docker network and loopback-only published ports", () => {
  assert.match(compose, /isolated:\s*[\s\S]*?internal: true/);
  assert.match(compose, /host-loopback:/);
  assert.match(compose, /Application containers must never join this network/);
  for (const port of ["CORO_QA_PROVIDER_PORT", "CORO_QA_POSTGRES_PORT"])
    assert.match(compose, new RegExp(`127\\.0\\.0\\.1:\\$\\{${port}`));
});

test("provider fake is deterministic and contains no provider credential", async () => {
  const source = await readFile(
    new URL("../src/provider-container.mjs", import.meta.url),
    "utf8",
  );
  assert.match(source, /QA_INJECTED_FAILURE/);
  assert.doesNotMatch(source, /BREVO_API_KEY|TWILIO_AUTH_TOKEN|AWS_SECRET/);
});

test("internal runner exposes only a fixed loopback proxy and script allowlist", async () => {
  const source = await readFile(
    new URL("../src/internal-runner.mjs", import.meta.url),
    "utf8",
  );
  assert.match(source, /listen\(3155, "127\.0\.0\.1"/);
  assert.match(source, /govern-authority\.mjs/);
  assert.match(source, /api-smoke\.mjs/);
  assert.match(source, /business-smoke\.mjs/);
  assert.doesNotMatch(source, /0\.0\.0\.0|exec\(|shell:\s*true/);
});
