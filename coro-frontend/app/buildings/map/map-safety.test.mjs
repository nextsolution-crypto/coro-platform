import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const helper = await readFile(
  new URL("./map-safety.ts", import.meta.url),
  "utf8",
);
const page = await readFile(new URL("./page.tsx", import.meta.url), "utf8");

test("coordinate contract accepts zero and rejects missing, non-finite and out-of-range values", () => {
  assert.match(helper, /Number\.isFinite\(value\.latitude\)/);
  assert.match(helper, /value\.latitude >= -90/);
  assert.match(helper, /value\.longitude <= 180/);
  assert.doesNotMatch(page, /b\.latitude\s*&&\s*b\.longitude/);
});

test("organization map uses local Leaflet and safe DOM tooltip content", () => {
  assert.match(page, /import\(["']leaflet["']\)/);
  assert.doesNotMatch(page, /unpkg\.com/);
  assert.match(page, /createSafeTooltip\(document/);
  assert.doesNotMatch(page, /bindTooltip\(`[^`]*\$\{building\.name\}/s);
});

test("navigation accepts only canonical entity identifiers", () => {
  assert.match(helper, /\^\[A-Za-z0-9_-\]\{1,128\}\$/);
  assert.match(page, /safeEntityPath/);
});

test("the freshness heuristic is labelled as a verification cue, not a regulatory renewal", () => {
  assert.match(page, /new Date\(p\.updatedAt\)/);
  assert.match(page, /Mise à jour à vérifier/);
  assert.doesNotMatch(page, /À renouveler/);
});
