import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { shouldReplaceDraft } from "./reviewDraftState.mjs";

test("an initial load hydrates the editor", () => {
  assert.equal(shouldReplaceDraft({ background: false, dirty: false }), true);
});

test("background refresh preserves an unsaved draft", () => {
  assert.equal(shouldReplaceDraft({ background: true, dirty: true }), false);
});

test("background refresh can hydrate a clean draft", () => {
  assert.equal(shouldReplaceDraft({ background: true, dirty: false }), true);
});

test("failed mutations do not close or clear child forms", () => {
  const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "page.tsx"), "utf8");
  assert.match(source, /then\(\(saved\) => \{\s*if \(!saved\) return;/);
  assert.match(source, /then\(\(saved\) => saved && setRecommendationFor\(null\)\)/);
  assert.match(source, /then\(\(saved\) => saved && setActionFor\(null\)\)/);
});

test("out-of-order loads are rejected by a generation guard", () => {
  const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "page.tsx"), "utf8");
  assert.match(source, /const generation = \+\+loadGeneration\.current/);
  assert.match(source, /generation !== loadGeneration\.current/);
});
