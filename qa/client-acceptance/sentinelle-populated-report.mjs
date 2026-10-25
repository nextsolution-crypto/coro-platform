#!/usr/bin/env node
import { createRequire } from "node:module";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const require = createRequire(join(resolve("coro-backend"), "package.json"));
const { PrismaClient } = require("@prisma/client");
const puppeteer = require("puppeteer");

const api = (process.env.CORO_QA_BACKEND_URL || "http://127.0.0.1:3170/api").replace(/\/$/, "");
const portal = (process.env.CORO_QA_PORTAL_URL || "http://127.0.0.1:3171").replace(/\/$/, "");
const password = process.env.CORO_QA_SYNTHETIC_PASSWORD;
const mfaDirectory = process.env.CORO_QA_MFA_DIR;
const output = process.env.CORO_QA_EVIDENCE;
const buildingA = "40000000-0000-4000-8000-000000000001";
const buildingB = "40000000-0000-4000-8000-000000000002";
const orgA = "10000000-0000-4000-8000-000000000002";
const runKey = `populated-report-${Date.now()}`;
if (!password || !mfaDirectory || !output) throw new Error("QA configuration incomplete");

const prisma = new PrismaClient();
const evidence = { generatedAt: new Date().toISOString(), commit: process.env.CORO_QA_COMMIT, api: [], browser: [], export: {} };
const occupantIds = [];
let evacuationId;

async function call(route, { token, method = "GET", body } = {}) {
  const response = await fetch(`${api}${route}`, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data = text;
  try { data = JSON.parse(text); } catch {}
  return { status: response.status, data };
}

async function mfaCode(email, after) {
  const files = await Promise.all((await readdir(mfaDirectory)).map(async name => ({ name, time: (await stat(join(mfaDirectory, name))).mtimeMs })));
  for (const file of files.sort((a, b) => b.time - a.time)) {
    if (file.time < after - 2000) break;
    const message = JSON.parse(await readFile(join(mfaDirectory, file.name), "utf8"));
    if (String(message.to).toLowerCase() === email) return /\b(\d{6})\b/.exec(message.subject)?.[1];
  }
  throw new Error(`MFA capture missing for ${email}`);
}

async function login(email) {
  const after = Date.now();
  const challenge = await call("/client-auth/login", { method: "POST", body: { email, password } });
  if (challenge.status !== 201) throw new Error(`Authentication challenge failed for ${email}: ${challenge.status}`);
  const verified = await call("/client-auth/verify-mfa", { method: "POST", body: { email, code: await mfaCode(email, after) } });
  const token = verified.data?.access_token ?? verified.data?.token;
  if (verified.status !== 201 || !token) throw new Error(`MFA verification failed for ${email}: ${verified.status}`);
  return { token, user: verified.data.user };
}

function record(id, pass, observed) {
  evidence.api.push({ id, status: pass ? "PASS" : "FAIL", observed });
}

async function install(page, auth) {
  await page.goto(`${portal}/login`, { waitUntil: "domcontentloaded" });
  await page.evaluate(({ token, user }) => {
    localStorage.setItem("coro_client_token", token);
    localStorage.setItem("coro_client_user", JSON.stringify(user));
  }, auth);
}

function geometry() {
  const root = document.documentElement;
  const selectors = ["main", "header", "section", "button", "article", "table", "div"];
  const boxes = selectors.flatMap(selector => [...document.querySelectorAll(selector)].map(element => {
    const rect = element.getBoundingClientRect();
    return { selector, left: rect.left, right: rect.right, width: rect.width, visible: rect.width > 0 && rect.height > 0 };
  }));
  return {
    viewport: { width: innerWidth, height: innerHeight },
    globalOverflow: root.scrollWidth > root.clientWidth + 1,
    failures: boxes.filter(box => box.visible && (box.left < -1 || box.right > innerWidth + 1)),
    text: document.body.innerText,
  };
}

await mkdir(output, { recursive: true });
try {
  const manager = await login("portal-local-a@global-e2e.test");
  const corporate = await login("portal-corporate-a@global-e2e.test");
  const otherTenant = await login("portal-corporate-b@global-e2e.test");

  const fixtures = [
    { type: "EMPLOYE", firstName: "Alice", lastName: "Tremblay", company: "Synthetic Customer A" },
    { type: "EMPLOYE", firstName: "Benoit", lastName: "Roy", company: "Synthetic Customer A" },
    { type: "VISITEUR", firstName: "Chloe", lastName: "Martin", company: "Visiteurs QA" },
    { type: "CONTRACTEUR", firstName: "David", lastName: "Nguyen", company: "Contracteurs QA" },
  ];
  const initialAt = new Date(Date.now() - 10 * 60_000);
  for (const fixture of fixtures) {
    const row = await prisma.occupancyRecord.create({ data: { ...fixture, buildingId: buildingA, organizationId: orgA, status: "IN", checkedInAt: initialAt, reason: runKey } });
    occupantIds.push(row.id);
  }

  const trigger = await call(`/client-portal/buildings/${buildingA}/sentinelle/evacuation/trigger`, {
    token: manager.token, method: "POST", body: { triggeredBy: "Exercice QA sans alarme", notes: runKey },
  });
  evacuationId = trigger.data?.id;
  record("canonical-trigger", trigger.status === 201 && Boolean(evacuationId) && trigger.data.totalPresent === 4, { status: trigger.status, id: evacuationId, totalPresent: trigger.data?.totalPresent });

  const eventAfterTrigger = await prisma.evacuationEvent.findUnique({ where: { id: evacuationId }, include: { checkins: true } });
  const snapshot = Array.isArray(eventAfterTrigger?.snapshot) ? eventAfterTrigger.snapshot : [];
  record("initial-presence-snapshot", snapshot.length === 4 && eventAfterTrigger?.checkins.length === 4 && fixtures.every(f => snapshot.some(x => x.firstName === f.firstName && x.type === f.type)), { snapshotCount: snapshot.length, checkinCount: eventAfterTrigger?.checkins.length });

  for (const [index, occupantRecordId] of occupantIds.slice(0, 2).entries()) {
    const accounted = await call(`/client-portal/buildings/${buildingA}/sentinelle/evacuations/${evacuationId}/account`, {
      token: manager.token, method: "POST", body: { occupantRecordId, checkedBy: index === 0 ? "Responsable QA" : "Adjoint QA" },
    });
    record(`account-${index + 1}`, accounted.status === 201 && accounted.data?.isAccountedFor === true && Boolean(accounted.data?.checkedAt), { status: accounted.status, checkedAt: accounted.data?.checkedAt, checkedBy: accounted.data?.checkedBy });
  }

  const resolved = await call(`/client-portal/buildings/${buildingA}/sentinelle/evacuations/${evacuationId}/resolve`, { token: manager.token, method: "PUT" });
  record("resolve-exercise", resolved.status === 200 && resolved.data?.status === "RESOLVED" && Boolean(resolved.data?.resolvedAt), { status: resolved.status, state: resolved.data?.status, resolvedAt: resolved.data?.resolvedAt });

  const detail = await call(`/client-portal/buildings/${buildingA}/sentinelle/evacuations/${evacuationId}`, { token: corporate.token });
  const checkins = detail.data?.checkins ?? [];
  const datesConsistent = checkins.every(c => c.isAccountedFor ? Boolean(c.checkedAt && c.checkedBy) : !c.checkedAt && !c.checkedBy);
  const temporalOrder = Date.parse(detail.data?.triggeredAt) <= Date.parse(detail.data?.resolvedAt) && checkins.filter(c => c.checkedAt).every(c => Date.parse(c.checkedAt) >= Date.parse(detail.data.triggeredAt));
  record("populated-report-consistency", detail.status === 200 && detail.data.totalPresent === 4 && detail.data.accounted === 2 && detail.data.missing === 2 && checkins.length === 4 && datesConsistent && temporalOrder, { status: detail.status, total: detail.data?.totalPresent, accounted: detail.data?.accounted, missing: detail.data?.missing, types: checkins.map(c => c.occupantRecord?.type), datesConsistent, temporalOrder });

  const denied = await call(`/client-portal/buildings/${buildingA}/sentinelle/evacuations/${evacuationId}`, { token: otherTenant.token });
  const wrongBuilding = await call(`/client-portal/buildings/${buildingB}/sentinelle/evacuations/${evacuationId}`, { token: corporate.token });
  const anonymous = await call(`/client-portal/buildings/${buildingA}/sentinelle/evacuations/${evacuationId}`);
  record("authorization-denials", [denied.status, wrongBuilding.status].every(s => s === 403 || s === 404) && anonymous.status === 401, { otherTenant: denied.status, wrongBuilding: wrongBuilding.status, anonymous: anonymous.status, protectedPayloadLeaked: [denied, wrongBuilding, anonymous].some(x => x.data?.checkins) });

  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const consoleErrors = [];
  try {
    const page = await browser.newPage();
    page.on("console", entry => { if (entry.type() === "error") consoleErrors.push(entry.text()); });
    page.on("pageerror", error => consoleErrors.push(error.message));
    const viewports = [[1440, 900], [1920, 1080], [390, 844], [430, 932]];
    const themes = [
      { id: "classic", ui: "legacy", preference: "LIGHT", expectedTheme: "light" },
      { id: "glass-light", ui: "glass", preference: "LIGHT", expectedTheme: "light" },
      { id: "glass-dark", ui: "glass", preference: "DARK", expectedTheme: "dark" },
    ];
    for (const [width, height] of viewports) for (const theme of themes) {
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      await install(page, manager);
      await page.evaluate(({ ui, preference }) => { localStorage.setItem("coro-ui-generation", ui); localStorage.setItem("coro-theme-preference", preference); }, theme);
      await page.goto(`${portal}/sentinelle/${buildingA}/rapports`, { waitUntil: "networkidle2" });
      await page.waitForSelector("section button", { timeout: 10_000 });
      await page.click("section button");
      await page.waitForFunction(() => document.body.innerText.includes("Alice Tremblay") && document.body.innerText.includes("David Nguyen"), { timeout: 10_000 });
      const observed = await page.evaluate(geometry);
      const root = await page.evaluate(() => ({ ui: document.documentElement.getAttribute("data-ui"), theme: document.documentElement.getAttribute("data-theme") }));
      const pass = !observed.globalOverflow && observed.failures.length === 0 && /4\s+Pr.sent/i.test(observed.text) && /2\s+Comptabilis/i.test(observed.text) && /2\s+Manquant/i.test(observed.text) && root.ui === theme.ui && root.theme === theme.expectedTheme;
      const id = `${width}x${height}-${theme.id}`;
      await page.screenshot({ path: join(output, `${id}.png`), fullPage: true });
      evidence.browser.push({ id, status: pass ? "PASS" : "FAIL", geometry: observed, root });
    }

    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await install(page, manager);
    await page.goto(`${portal}/sentinelle/${buildingA}/rapports`, { waitUntil: "networkidle2" });
    await page.click("section button");
    await page.waitForFunction(() => document.body.innerText.includes("Alice Tremblay"));
    const popupPromise = new Promise(resolvePopup => browser.once("targetcreated", async target => resolvePopup(await target.page())));
    await page.evaluate(() => [...document.querySelectorAll("button")].find(button => button.textContent?.includes("Exporter PDF"))?.click());
    const popup = await popupPromise;
    await popup.waitForFunction(() => document.readyState === "complete" && document.body.innerText.includes("Alice Tremblay"), { timeout: 10_000 });
    const pdfPath = join(output, "rapport-evacuation-peuple.pdf");
    await popup.pdf({ path: pdfPath, format: "A4", printBackground: true, margin: { top: "12mm", right: "10mm", bottom: "12mm", left: "10mm" } });
    const popupText = await popup.evaluate(() => document.body.innerText);
    evidence.export = { pdfPath, bytes: (await stat(pdfPath)).size, popupTextContainsAllOccupants: fixtures.every(f => popupText.includes(`${f.firstName} ${f.lastName}`)), countersPresent: /4\s+Pr.sent/i.test(popupText) && /2\s+Comptabilis/i.test(popupText) && /2\s+Manquant/i.test(popupText) };
    await popup.close();

    await page.evaluateOnNewDocument(() => {
      const realFetch = window.fetch.bind(window);
      let failOnce = true;
      window.__syntheticEvacuationFailures = 0;
      window.fetch = (input, init) => {
        if (failOnce && String(input).includes("/evacuations") && (!init?.method || init.method === "GET")) {
          failOnce = false;
          window.__syntheticEvacuationFailures += 1;
          return Promise.resolve(new Response(JSON.stringify({ message: "synthetic report failure" }), { status: 503, headers: { "content-type": "application/json" } }));
        }
        return realFetch(input, init);
      };
    });
    await page.reload({ waitUntil: "networkidle2" });
    await page.waitForSelector('[role="alert"]', { timeout: 5_000 }).catch(() => null);
    const errorVisible = await page.evaluate(() => Boolean(document.querySelector('[role="alert"] button')));
    await page.evaluate(() => document.querySelector('[role="alert"] button')?.click());
    await page.waitForFunction(() => !document.querySelector('[role="alert"]') && document.querySelectorAll("section button").length > 0, { timeout: 10_000 });
    const retryRecovered = await page.evaluate(() => !document.querySelector('[role="alert"]') && document.querySelectorAll("section button").length > 0);
    const interceptedCount = await page.evaluate(() => window.__syntheticEvacuationFailures || 0);
    evidence.browser.push({ id: "error-and-retry", status: errorVisible && retryRecovered && interceptedCount === 1 ? "PASS" : "FAIL", errorVisible, retryRecovered, interceptedCount });
  } finally {
    await browser.close();
  }

  evidence.consoleErrors = [...new Set(consoleErrors)].filter(message => !/favicon|Failed to load resource.*(?:401|403|503)|synthetic report failure/i.test(message));
  evidence.pass = evidence.api.every(item => item.status === "PASS") && evidence.browser.every(item => item.status === "PASS") && evidence.export.bytes > 1000 && evidence.export.popupTextContainsAllOccupants && evidence.export.countersPresent && evidence.consoleErrors.length === 0;
  await writeFile(join(output, "sentinelle-populated-report.json"), JSON.stringify(evidence, null, 2));
  console.log(`SENTINELLE_POPULATED_REPORT_${evidence.pass ? "PASS" : "FAIL"}: API ${evidence.api.filter(x => x.status === "PASS").length}/${evidence.api.length}, browser ${evidence.browser.filter(x => x.status === "PASS").length}/${evidence.browser.length}, export ${evidence.export.bytes} bytes`);
  if (!evidence.pass) process.exitCode = 1;
} finally {
  if (evacuationId) {
    await prisma.evacuationCheckIn.deleteMany({ where: { evacuationEventId: evacuationId } });
    await prisma.evacuationEvent.deleteMany({ where: { id: evacuationId } });
  }
  if (occupantIds.length) await prisma.occupancyRecord.deleteMany({ where: { id: { in: occupantIds } } });
  await prisma.$disconnect();
}
