import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = new URL(".", import.meta.url).pathname.slice(1);

function sourceFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory()
      ? sourceFiles(path)
      : path.endsWith(".tsx") || path.endsWith(".ts")
        ? [path]
        : [];
  });
}

const sources = sourceFiles(root).map((path) => ({
  path,
  source: readFileSync(path, "utf8"),
}));

test("authenticated Sentinelle pages use Client Portal facades for protected operations", () => {
  const forbidden = [
    /api(?:Get|Post|Put|Delete)\([^\n]*`?\/occupancy\/buildings\/\$\{buildingId\}\/kiosk-token/,
    /api(?:Get|Post|Put|Delete)\([^\n]*`?\/occupancy\/buildings\/\$\{buildingId\}\/alarm-token/,
    /api(?:Get|Post|Put|Delete)\([^\n]*["'`]\/occupancy\/evacuation/,
    /api(?:Get|Post|Put|Delete)\([^\n]*["'`]\/occupancy\/(?:employees|invitations)/,
    /api(?:Get|Post|Put|Delete)\([^\n]*`?\/occupancy\/buildings\/\$\{buildingId\}\/(?:employees|invitations)/,
  ];
  for (const { path, source } of sources) {
    for (const pattern of forbidden) {
      assert.doesNotMatch(source, pattern, path);
    }
  }
});

test("public token-based Sentinelle operations remain explicit", () => {
  const landing = sources.find(({ path }) => path.endsWith("[buildingId]\\page.tsx"))?.source ?? "";
  assert.match(landing, /\/occupancy\/buildings\/\$\{buildingId\}\/current-public\?token=/);
  assert.match(landing, /\/occupancy\/alarm-trigger\/\$\{alarmToken\}/);
});

test("dashboard and direct Sentinelle entry remain authenticated Client Portal surfaces", () => {
  const dashboard = readFileSync(join(root, "..", "dashboard", "page.tsx"), "utf8");
  const landing = sources.find(({ path }) => path.endsWith("[buildingId]\\page.tsx"))?.source ?? "";
  assert.match(dashboard, /router\.push\(`\/sentinelle\/\$\{b\.id\}`\)/);
  assert.match(landing, /<PortalLayout>/);
  assert.match(landing, /\/client-portal\/buildings\/\$\{buildingId\}\/sentinelle\/kiosk-token/);
});

test("401 remains terminal while 403 does not clear a valid client session", () => {
  const auth = readFileSync(join(root, "..", "store", "auth.ts"), "utf8");
  assert.match(auth, /if \(res\.status === 401\) \{\s*handleUnauthorized\(\)/);
  assert.doesNotMatch(auth, /res\.status === 403[\s\S]{0,120}handleUnauthorized/);
});

test("public Population registration remains outside the authenticated Sentinelle tree", () => {
  const publicPage = join(root, "..", "population", "[publicSlug]", "page.tsx");
  assert.equal(statSync(publicPage).isFile(), true);
  assert.doesNotMatch(readFileSync(publicPage, "utf8"), /PortalLayout|client-auth\/me/);
});
