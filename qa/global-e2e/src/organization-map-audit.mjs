#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const organizationPath = path.join(
  root,
  "coro-frontend",
  "app",
  "buildings",
  "map",
  "page.tsx",
);
const portalPath = path.join(
  root,
  "coro-client-portal",
  "app",
  "map",
  "page.tsx",
);
const buildingsServicePath = path.join(
  root,
  "coro-backend",
  "src",
  "buildings",
  "buildings.service.ts",
);
const output =
  process.env.CORO_QA_EVIDENCE_DIR ||
  path.join(root, "qa-evidence", "organization-map");

const [organization, portal, buildingsService] = await Promise.all([
  readFile(organizationPath, "utf8"),
  readFile(portalPath, "utf8"),
  readFile(buildingsServicePath, "utf8"),
]);

const checks = [];
const check = (id, pass, evidence) => checks.push({ id, pass, evidence });

check(
  "MAP_SCOPE_ORGANIZATION",
  /organizationId: actor\.organizationId/.test(buildingsService),
  "Buildings.findAll scopes by actor.organizationId.",
);
check(
  "MAP_SCOPE_OPERATOR",
  /actor\.role === 'OPERATOR'/.test(buildingsService),
  "Operator reads are constrained to assigned projects.",
);
check(
  "MAP_ORG_API_ERROR_STATE",
  /setLoadError\(/.test(organization) && /Réessayer/.test(organization),
  "Organization map must distinguish API failure from empty data.",
);
check(
  "MAP_PORTAL_API_ERROR_STATE",
  /setLoadError\(/.test(portal) && /Réessayer/.test(portal),
  "Portal map exposes an alert and retry.",
);
check(
  "MAP_ORG_LOCAL_LEAFLET",
  /import\(['"]leaflet['"]\)/.test(organization) &&
    !/unpkg\.com/.test(organization),
  "Organization map should use the locked local Leaflet package.",
);
check(
  "MAP_PORTAL_LOCAL_LEAFLET",
  /import\(['"]leaflet['"]\)/.test(portal) && !/unpkg\.com/.test(portal),
  "Portal map uses the locked local Leaflet package.",
);
check(
  "MAP_ORG_ATTRIBUTION_VISIBLE",
  !/attributionControl:\s*false/.test(organization) ||
    /L\.control\.attribution/.test(organization),
  "OSM attribution control must remain visible.",
);
check(
  "MAP_PORTAL_ATTRIBUTION_VISIBLE",
  !/attributionControl:\s*false/.test(portal) ||
    /L\.control\.attribution/.test(portal),
  "OSM attribution control must remain visible.",
);
check(
  "MAP_ORG_ZERO_COORDINATES",
  !/b\.latitude\s*&&\s*b\.longitude/.test(organization),
  "Latitude or longitude zero must not mean missing.",
);
check(
  "MAP_PORTAL_ZERO_COORDINATES",
  !/b\.latitude\s*&&\s*b\.longitude/.test(portal),
  "Latitude or longitude zero must not mean missing.",
);
check(
  "MAP_ORG_COORDINATE_BOUNDS",
  /Number\.isFinite/.test(organization) &&
    /-90/.test(organization) &&
    /180/.test(organization),
  "Map input must reject non-finite and out-of-range coordinates.",
);
check(
  "MAP_PORTAL_COORDINATE_BOUNDS",
  /Number\.isFinite/.test(portal) && /-90/.test(portal) && /180/.test(portal),
  "Map input must reject non-finite and out-of-range coordinates.",
);
check(
  "MAP_ORG_TOOLTIP_ESCAPED",
  !/bindTooltip\(`[^`]*\$\{building\.name\}/s.test(organization),
  "Building and client labels must not be interpolated into Leaflet HTML.",
);
check(
  "MAP_PORTAL_TOOLTIP_ESCAPED",
  !/bindTooltip\(`[^`]*\$\{building\.name\}/s.test(portal),
  "Building labels must not be interpolated into Leaflet HTML.",
);

const samples = [
  { latitude: 45.5, longitude: -73.5, expected: true },
  { latitude: 0, longitude: 0, expected: true },
  { latitude: 91, longitude: 0, expected: false },
  { latitude: 0, longitude: -181, expected: false },
  { latitude: Number.NaN, longitude: 1, expected: false },
  { latitude: null, longitude: null, expected: false },
];
const validCoordinate = ({ latitude, longitude }) =>
  typeof latitude === "number" &&
  Number.isFinite(latitude) &&
  latitude >= -90 &&
  latitude <= 90 &&
  typeof longitude === "number" &&
  Number.isFinite(longitude) &&
  longitude >= -180 &&
  longitude <= 180;
for (const sample of samples)
  assert.equal(validCoordinate(sample), sample.expected);

const report = {
  schemaVersion: 1,
  auditedCommit: process.env.CORO_AUDITED_SHA || null,
  generatedAt: new Date().toISOString(),
  coordinateCases: samples.map((sample) => ({
    ...sample,
    observed: validCoordinate(sample),
  })),
  checks,
  passed: checks.filter((item) => item.pass).length,
  failed: checks.filter((item) => !item.pass).length,
};
await mkdir(output, { recursive: true });
await writeFile(
  path.join(output, "organization-map-audit.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(
  `ORGANIZATION_MAP_AUDIT_COMPLETE: ${report.passed} pass, ${report.failed} finding(s)`,
);
