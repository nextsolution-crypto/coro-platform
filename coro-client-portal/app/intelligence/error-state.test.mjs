import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("./page.tsx", import.meta.url), "utf8");

test("Intelligence failure is explicit and retryable instead of rendering an empty page", () => {
  assert.match(source, /role="alert"/);
  assert.match(source, /Intelligence indisponible/);
  assert.match(source, /onClick=\{fetchData\}/);
  assert.match(source, /setData\(null\)/);
  assert.doesNotMatch(source, /if \(!data\) return null/);
});
