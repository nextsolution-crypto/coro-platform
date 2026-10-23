import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

test("identity acceptance resolves Puppeteer from the repository root", async () => {
  const source = await readFile(
    fileURLToPath(new URL("../src/identity-acceptance.mjs", import.meta.url)),
    "utf8",
  );
  assert.match(source, /new URL\("\.\.\/\.\.\/\.\.\/", import\.meta\.url\)/);
  assert.match(source, /join\(repositoryRoot, "coro-backend", "package\.json"\)/);
  assert.doesNotMatch(source, /resolve\("coro-backend"\)/);
  assert.match(source, /authWindowMs = 61_000/);
  assert.match(source, /index % 2 === 0/);
});
