import { stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve, join } from "node:path";
import { publicCatalogue } from "./identity-catalogue.mjs";
import { assertLocalUrl, assertSafeEnvironment } from "./policy.mjs";

export async function runIdentityPreflight(config) {
  assertSafeEnvironment();
  const backend = assertLocalUrl(config.apiUrl, "CORO_QA_BACKEND_URL");
  const portal = assertLocalUrl(config.portalUrl, "CORO_QA_PORTAL_URL");
  const results = [];
  const record = (id, pass, detail) => results.push({ id, status: pass ? "PASS" : "FAIL", detail });

  try {
    const response = await fetch(`${backend.href.replace(/\/$/, "")}/client-auth/login`, {
      method: "OPTIONS",
      headers: { origin: portal.origin, "access-control-request-method": "POST", "access-control-request-headers": "content-type" },
    });
    record("cors-origin", response.headers.get("access-control-allow-origin") === portal.origin, `${portal.origin} -> ${response.status}`);
  } catch (error) { record("cors-origin", false, error.message); }

  try {
    const response = await fetch(`${config.mfaAdapterUrl}/health`, { headers: { authorization: `Bearer ${config.mfaChannelToken}` } });
    record("mfa-adapter", response.status === 200, `HTTP ${response.status}`);
  } catch (error) { record("mfa-adapter", false, error.message); }

  try {
    const require = createRequire(join(resolve("coro-backend"), "package.json"));
    const puppeteer = require("puppeteer");
    await stat(await puppeteer.executablePath());
    record("chrome", true, "Bundled Chrome executable available");
  } catch (error) { record("chrome", false, error.message); }

  record("actor-catalogue", publicCatalogue().length === 9, `${publicCatalogue().length} actors`);

  try {
    if (!config.databaseUrl || !config.syntheticPassword)
      throw new Error("DATABASE_URL and the QA synthetic password are required");
    const require = createRequire(join(resolve("coro-backend"), "package.json"));
    const { PrismaClient } = require("@prisma/client");
    const bcrypt = require("bcrypt");
    const prisma = new PrismaClient({ datasources: { db: { url: config.databaseUrl } } });
    try {
      const catalogue = publicCatalogue();
      const internal = catalogue.filter((item) => item.kind === "internal");
      const portalActors = catalogue.filter((item) => item.kind === "portal");
      const [users, clientUsers, migrations, organizations, clients, buildings] = await Promise.all([
        prisma.user.findMany({ where: { email: { in: internal.map((item) => item.email) } }, select: { email: true, role: true, password: true, isActive: true } }),
        prisma.clientUser.findMany({ where: { email: { in: portalActors.map((item) => item.email) } }, select: { email: true, role: true, password: true, isActive: true, buildingIds: true } }),
        prisma.$queryRaw`SELECT COUNT(*)::int AS count, COUNT(*) FILTER (WHERE finished_at IS NULL)::int AS unfinished FROM "_prisma_migrations"`,
        prisma.organization.count(), prisma.client.count(), prisma.building.count(),
      ]);
      const records = [...users, ...clientUsers];
      const recordsByEmail = new Map(records.map((item) => [item.email, item]));
      const identitiesValid = catalogue.every((expected) => {
        const actual = recordsByEmail.get(expected.email);
        return actual && actual.role === expected.role && actual.isActive === (expected.active !== false);
      });
      const passwordsValid = (await Promise.all(records.map((item) => bcrypt.compare(config.syntheticPassword, item.password)))).every(Boolean);
      const scopeValid = (recordsByEmail.get("portal-zero-a@global-e2e.test")?.buildingIds?.length ?? -1) === 0
        && (recordsByEmail.get("portal-local-a@global-e2e.test")?.buildingIds?.length ?? 0) === 1;
      record("database-migrations", migrations[0]?.count >= 140 && migrations[0]?.unfinished === 0, `${migrations[0]?.count ?? 0} applied; ${migrations[0]?.unfinished ?? "?"} unfinished`);
      record("actor-records", identitiesValid && records.length === catalogue.length, `${records.length}/${catalogue.length} exact actors`);
      record("password-authentication", passwordsValid, `${records.length} synthetic password hashes verified`);
      record("required-permissions", scopeValid, "roles and building scopes match the catalogue");
      record("required-test-data", organizations >= 3 && clients >= 2 && buildings >= 1, `${organizations} organizations, ${clients} clients, ${buildings} buildings`);
    } finally { await prisma.$disconnect(); }
  } catch (error) {
    for (const id of ["database-migrations", "actor-records", "password-authentication", "required-permissions", "required-test-data"])
      record(id, false, error.message);
  }
  record("network-isolation", config.networkIsolated === true, config.networkIsolated ? "deny-by-default declared by harness" : "missing proof");
  record("provider-egress", config.providerEgressBlocked === true, config.providerEgressBlocked ? "backend provider DNS denied" : "missing proof");
  return { pass: results.every((item) => item.status === "PASS"), results };
}
