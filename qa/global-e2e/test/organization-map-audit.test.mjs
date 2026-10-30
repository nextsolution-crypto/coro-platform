import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("organization and portal maps remain backed by canonically scoped building endpoints", async () => {
  const [organization, portal, service] = await Promise.all([
    readFile("coro-frontend/app/buildings/map/page.tsx", "utf8"),
    readFile("coro-client-portal/app/map/page.tsx", "utf8"),
    readFile("coro-backend/src/buildings/buildings.service.ts", "utf8"),
  ]);
  assert.match(organization, /api\.get\(["']\/buildings["']\)/);
  assert.match(portal, /apiGet\(["']\/client-portal\/buildings["']\)/);
  assert.match(service, /organizationId: actor\.organizationId/);
  assert.match(service, /actor\.role === 'OPERATOR'/);
});

test("both maps expose explicit API failure and retry states", async () => {
  const [organization, portal] = await Promise.all([
    readFile("coro-frontend/app/buildings/map/page.tsx", "utf8"),
    readFile("coro-client-portal/app/map/page.tsx", "utf8"),
  ]);
  assert.match(organization, /setLoadError\(/);
  assert.match(organization, /Réessayer/);
  assert.match(portal, /setLoadError\(/);
  assert.match(portal, /Réessayer/);
});

test("provider and coordinate corrections remain enforced", async () => {
  const [organization, portal, organizationSafety, portalSafety] =
    await Promise.all([
      readFile("coro-frontend/app/buildings/map/page.tsx", "utf8"),
      readFile("coro-client-portal/app/map/page.tsx", "utf8"),
      readFile("coro-frontend/app/buildings/map/map-safety.ts", "utf8"),
      readFile("coro-client-portal/app/map/map-safety.ts", "utf8"),
    ]);
  assert.doesNotMatch(organization, /unpkg\.com/);
  assert.match(organization, /import\(["']leaflet["']\)/);
  assert.match(organization, /L\.control\.attribution/);
  assert.match(portal, /L\.control\.attribution/);
  assert.doesNotMatch(organization, /b\.latitude\s*&&\s*b\.longitude/);
  assert.doesNotMatch(portal, /b\.latitude\s*&&\s*b\.longitude/);
  assert.match(organizationSafety, /Number\.isFinite/);
  assert.match(portalSafety, /Number\.isFinite/);
});
