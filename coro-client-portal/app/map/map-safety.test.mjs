import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const helper = await readFile(
  new URL("./map-safety.ts", import.meta.url),
  "utf8",
);
const page = await readFile(new URL("./page.tsx", import.meta.url), "utf8");

test("portal map uses bounded coordinates without treating zero as missing", () => {
  assert.match(helper, /Number\.isFinite\(value\.longitude\)/);
  assert.match(helper, /value\.longitude >= -180/);
  assert.doesNotMatch(page, /b\.latitude\s*&&\s*b\.longitude/);
});

test("portal tooltips use textContent and never interpolate business data as HTML", () => {
  assert.match(helper, /title\.textContent/);
  assert.match(page, /createSafeTooltip\(document/);
  assert.doesNotMatch(page, /bindTooltip\(`<span[^`]*\$\{building\.name\}/s);
});

test("the public tile contract retains explicit attribution", () => {
  assert.match(
    page,
    /https:\/\/tile\.openstreetmap\.org\/\{z\}\/\{x\}\/\{y\}\.png/,
  );
  assert.match(page, /L\.control\.attribution/);
});

test("map initialization is retried when the authenticated user becomes available", () => {
  assert.match(page, /ref=\{setMapContainer\}/);
  assert.match(page, /\[loading, buildings, user, mapContainerMounted\]/);
});

test("the freshness heuristic is labelled as a verification cue, not a regulatory renewal", () => {
  assert.match(page, /new Date\(p\.updatedAt\)/);
  assert.match(page, /Mise à jour à vérifier/);
  assert.doesNotMatch(page, /À renouveler/);
});
