import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("organization and portal maps remain backed by canonically scoped building endpoints", async () => {
  const [organization, portal, service] = await Promise.all([
    readFile("coro-frontend/app/buildings/map/page.tsx", "utf8"),
    readFile("coro-client-portal/app/map/page.tsx", "utf8"),
    readFile("coro-backend/src/buildings/buildings.service.ts", "utf8"),
  ]);
  assert.match(organization, /api\.get\('\/buildings'\)/);
  assert.match(portal, /apiGet\('\/client-portal\/buildings'\)/);
  assert.match(service, /organizationId: actor\.organizationId/);
  assert.match(service, /actor\.role === 'OPERATOR'/);
});

test("portal has an explicit API error state while the organization map gap stays detectable", async () => {
  const [organization, portal] = await Promise.all([
    readFile("coro-frontend/app/buildings/map/page.tsx", "utf8"),
    readFile("coro-client-portal/app/map/page.tsx", "utf8"),
  ]);
  assert.doesNotMatch(organization, /setLoadError\(/);
  assert.match(portal, /setLoadError\(/);
  assert.match(portal, /Réessayer/);
});

test("provider and coordinate risks remain explicit until corrected", async () => {
  const [organization, portal] = await Promise.all([
    readFile("coro-frontend/app/buildings/map/page.tsx", "utf8"),
    readFile("coro-client-portal/app/map/page.tsx", "utf8"),
  ]);
  assert.match(organization, /unpkg\.com\/leaflet@1\.9\.4/);
  assert.match(organization, /b\.latitude\s*&&\s*b\.longitude/);
  assert.match(portal, /b\.latitude\s*&&\s*b\.longitude/);
  assert.match(organization, /attributionControl:\s*false/);
  assert.match(portal, /attributionControl:\s*false/);
});
