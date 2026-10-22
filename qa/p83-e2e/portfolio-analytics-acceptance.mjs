#!/usr/bin/env node
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { QaIdentityLab } from "../global-e2e/src/browser-orchestration.mjs";
import { loadSecretStore } from "../global-e2e/src/secret-store.mjs";
import { startMfaCaptureAdapter } from "../global-e2e/src/mfa-capture-adapter.mjs";
import { assertLocalUrl, assertUnderQaRoot } from "../global-e2e/src/policy.mjs";

const root = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const require = createRequire(join(root, "coro-backend", "package.json"));
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const apiUrl = assertLocalUrl(process.env.CORO_QA_BACKEND_URL, "CORO_QA_BACKEND_URL").href.replace(/\/$/, "");
const portalUrl = assertLocalUrl(process.env.CORO_QA_PORTAL_URL, "CORO_QA_PORTAL_URL").href.replace(/\/$/, "");
const evidence = assertUnderQaRoot(process.env.CORO_QA_EVIDENCE_DIR);
const mfaDirectory = assertUnderQaRoot(process.env.CORO_QA_MFA_DIR);
const secrets = await loadSecretStore();
const adapter = await startMfaCaptureAdapter({ captureDirectory: mfaDirectory, channelToken: secrets.mfaChannelToken });
const lab = new QaIdentityLab({ apiUrl, portalUrl, frontendUrl: portalUrl, password: secrets.syntheticPassword, mfaAdapterUrl: adapter.url, mfaChannelToken: secrets.mfaChannelToken });
const viewports = [[1440, 900], [1920, 1080], [390, 844], [430, 932]];
const themes = [
  { id: "classic", ui: "legacy", preference: "LIGHT", expectedUi: "legacy", expectedTheme: "light" },
  { id: "glass-light", ui: "glass", preference: "LIGHT", expectedUi: "glass", expectedTheme: "light" },
  { id: "glass-dark", ui: "glass", preference: "DARK", expectedUi: "glass", expectedTheme: "dark" },
];
const ids = {
  buildingA: "40000000-0000-4000-8000-000000000001",
  buildingB: "40000000-0000-4000-8000-000000000002",
  portfolio: "82000000-0000-4000-8000-000000000001",
  region: "83000000-0000-4000-8000-000000000001",
  regionalAssignment: "86000000-0000-4000-8000-000000000002",
};
const checks = [];
const check = (id, pass, detail) => { checks.push({ id, status: pass ? "PASS" : "FAIL", detail }); if (!pass) throw new Error(`${id}: ${detail}`); };

function geometry() {
  const visible = (node) => { const style = getComputedStyle(node); const rect = node.getBoundingClientRect(); return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0; };
  const nodes = [...document.querySelectorAll("main,header,section,article,form,label,select,input,button,a,dl")].filter(visible);
  const failures = nodes.flatMap((node) => { const rect = node.getBoundingClientRect(); const parent = node.parentElement?.getBoundingClientRect(); const containedScroll = getComputedStyle(node.parentElement ?? node).overflowX === "auto"; return rect.left < -1 || rect.right > innerWidth + 1 || Boolean(parent && !containedScroll && rect.right > parent.right + 2) ? [{ tag: node.tagName, left: rect.left, right: rect.right, parentRight: parent?.right ?? null }] : []; });
  return { viewport: { width: innerWidth, height: innerHeight }, ui: document.documentElement.dataset.ui, theme: document.documentElement.dataset.theme, globalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, failures, heading: document.querySelector("h1")?.textContent, filters: document.querySelectorAll("form select").length, cards: document.querySelectorAll("section article").length };
}

async function callAs(key, route) {
  const session = await lab.loginAs(key);
  return lab.call(route, { token: session.token });
}

try {
  await mkdir(evidence, { recursive: true });
  const corporate = await lab.loginAs("clientCorporateA");
  const regional = await lab.loginAs("clientRegionalA");
  const local = await lab.loginAs("clientLocalA");
  const [corporateData, regionalData, localData] = await Promise.all([
    lab.call("/client-portal/network/analytics", { token: corporate.token }),
    lab.call(`/client-portal/network/analytics?portfolioId=${ids.portfolio}&regionId=${ids.region}`, { token: regional.token }),
    lab.call(`/client-portal/network/analytics?buildingId=${ids.buildingA}`, { token: local.token }),
  ]);
  check("portfolio-filter", corporateData.status === 200 && corporateData.data.scope.buildingCount === 2, `HTTP ${corporateData.status}; ${corporateData.data?.scope?.buildingCount ?? "none"} buildings`);
  check("regional-filter", regionalData.status === 200 && regionalData.data.scope.buildingCount === 2, `HTTP ${regionalData.status}`);
  check("building-filter", localData.status === 200 && localData.data.scope.buildingCount === 1, `HTTP ${localData.status}`);
  check("longitudinal-trends", corporateData.data.trends.length > 0 && corporateData.data.trends.some((row) => row.exercises > 0), `${corporateData.data.trends.length} buckets`);
  check("source-provenance", Boolean(corporateData.data.provenance?.incidents && corporateData.data.provenance?.correctiveActions), "canonical source map present");
  check("freshness-and-missing", Boolean(corporateData.data.freshness && Array.isArray(corporateData.data.missingData)), "explicit states present");

  const deniedBuilding = await lab.call(`/client-portal/network/analytics?buildingId=${ids.buildingB}`, { token: local.token });
  check("building-denial", deniedBuilding.status === 403, `HTTP ${deniedBuilding.status}`);
  const zero = await callAs("clientWithoutBuildings", "/client-portal/network/analytics");
  check("unassigned-denial", zero.status === 403, `HTTP ${zero.status}`);
  const tenantB = await callAs("clientOrganizationB", `/client-portal/network/analytics?buildingId=${ids.buildingA}`);
  check("cross-tenant-denial", [403, 404].includes(tenantB.status), `HTTP ${tenantB.status}`);

  const exportResponse = await fetch(`${apiUrl}/client-portal/network/analytics/export?portfolioId=${ids.portfolio}`, { headers: { authorization: `Bearer ${corporate.token}` } });
  const bytes = Buffer.from(await exportResponse.arrayBuffer());
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  check("governed-export", exportResponse.status === 200 && exportResponse.headers.get("x-coro-content-sha256") === sha256 && bytes.includes(Buffer.from("period,incidents,exercises")), `HTTP ${exportResponse.status}; sha256 verified`);
  const audit = await prisma.adminAuditEvent.findFirst({ where: { action: "CUSTOMER_NETWORK_ANALYTICS_EXPORTED", actorClientUserId: corporate.user.id }, orderBy: { createdAt: "desc" } });
  check("export-audit", Boolean(audit && audit.organizationId === corporate.user.organizationId), "typed ClientUser audit persisted");

  const browserEvidence = join(evidence, "browser");
  await mkdir(browserEvidence, { recursive: true });
  const isolated = await lab.createIsolatedSession("clientCorporateA");
  const errors = [];
  isolated.page.on("console", (entry) => { if (entry.type() === "error") errors.push(entry.text()); });
  isolated.page.on("pageerror", (error) => errors.push(error.message));
  const matrix = [];
  for (const [width, height] of viewports) for (const theme of themes) {
    await isolated.page.setViewport({ width, height, deviceScaleFactor: 1 });
    await isolated.page.goto(portalUrl, { waitUntil: "domcontentloaded" });
    await isolated.page.evaluate(({ ui, preference }) => { localStorage.setItem("coro-ui-generation", ui); localStorage.setItem("coro-theme-preference", preference); }, theme);
    await isolated.page.goto(`${portalUrl}/network/analytics`, { waitUntil: "networkidle2" });
    await isolated.page.waitForSelector("form select", { timeout: 15000 });
    const before = await isolated.page.evaluate(geometry);
    await isolated.page.reload({ waitUntil: "networkidle2" });
    const after = await isolated.page.evaluate(geometry);
    const persistent = await isolated.page.evaluate(() => Boolean(localStorage.getItem("coro_client_token")));
    const id = `${width}x${height}-${theme.id}`;
    await isolated.page.screenshot({ path: join(browserEvidence, `${id}.png`), fullPage: true });
    const pass = before.viewport.width === width && before.viewport.height === height && before.ui === theme.expectedUi && before.theme === theme.expectedTheme && before.filters === 3 && before.cards >= 4 && !before.globalOverflow && before.failures.length === 0 && !after.globalOverflow && after.failures.length === 0 && persistent;
    matrix.push({ id, status: pass ? "PASS" : "FAIL", before, after, sessionPersistent: persistent });
  }
  await isolated.context.close(); if (isolated.ownedBrowser) await isolated.browser.close();
  const criticalErrors = [...new Set(errors)].filter((value) => !/favicon|404/i.test(value));
  check("browser-matrix", matrix.every((item) => item.status === "PASS") && criticalErrors.length === 0, `${matrix.filter((item) => item.status === "PASS").length}/12; ${criticalErrors.length} critical errors`);

  const assignment = await prisma.customerPortfolioAssignment.findUniqueOrThrow({ where: { id: ids.regionalAssignment }, select: { lockVersion: true } });
  const revoked = await lab.call(`/client-portal/network/assignments/${ids.regionalAssignment}/revoke`, { method: "POST", token: corporate.token, body: { lockVersion: assignment.lockVersion, reason: "P-8.3 immediate revocation acceptance" } });
  check("revocation-operation", revoked.status < 300, `HTTP ${revoked.status}`);
  const afterRevocation = await lab.call("/client-portal/network/analytics", { token: regional.token });
  check("revocation-denial", afterRevocation.status === 403, `HTTP ${afterRevocation.status}`);

  const report = { status: "PASS", executedAt: new Date().toISOString(), checks, matrix, criticalErrors, export: { bytes: bytes.length, sha256 }, sourceCounts: { incidents: corporateData.data.summary.incidents.total, exercises: corporateData.data.summary.exercises.published, operationalReviews: corporateData.data.summary.operationalReviews.total, correctiveActions: corporateData.data.summary.correctiveActions } };
  await writeFile(join(evidence, "p83-acceptance.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ status: report.status, checks: checks.length, matrix: "12/12", sha256 }));
} finally {
  await prisma.$disconnect();
  await adapter.close();
}
