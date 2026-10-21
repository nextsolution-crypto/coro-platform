#!/usr/bin/env node
import { createRequire } from "node:module";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const require = createRequire(join(resolve("coro-backend"), "package.json"));
const puppeteer = require("puppeteer");
const api = (process.env.CORO_QA_BACKEND_URL || "http://localhost:3166/api").replace(/\/$/, "");
const portal = (process.env.CORO_QA_PORTAL_URL || "http://localhost:3167").replace(/\/$/, "");
const mfaDirectory = process.env.CORO_QA_MFA_DIR;
const password = process.env.CORO_QA_SYNTHETIC_PASSWORD;
const output = process.env.CORO_QA_BROWSER_EVIDENCE;
if (!mfaDirectory || !password || !output) throw new Error("QA browser configuration is incomplete.");

async function call(route, options = {}) {
  const response = await fetch(`${api}${route}`, {
    method: options.method || "GET",
    headers: { "content-type": "application/json", ...(options.token ? { authorization: `Bearer ${options.token}` } : {}) },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  let data = text;
  try { data = JSON.parse(text); } catch {}
  return { status: response.status, data };
}

async function latestCode(email, after) {
  const entries = await Promise.all((await readdir(mfaDirectory)).map(async (name) => ({ name, time: (await stat(join(mfaDirectory, name))).mtimeMs })));
  for (const entry of entries.sort((a, b) => b.time - a.time)) {
    if (entry.time < after - 2000) break;
    const message = JSON.parse(await readFile(join(mfaDirectory, entry.name), "utf8"));
    if (String(message.to).toLowerCase() === email) return /\b(\d{6})\b/.exec(message.subject)?.[1];
  }
  throw new Error(`Synthetic MFA capture missing for ${email}`);
}

async function login(email) {
  const started = Date.now();
  const first = await call("/client-auth/login", { method: "POST", body: { email, password } });
  if (first.status !== 201 || !first.data?.mfaRequired) throw new Error(`Password/MFA challenge failed for ${email}: ${first.status}`);
  const verified = await call("/client-auth/verify-mfa", { method: "POST", body: { email, code: await latestCode(email, started) } });
  if (verified.status !== 201 || !verified.data?.token) throw new Error(`MFA verification failed for ${email}: ${verified.status}`);
  return verified.data;
}

async function installSession(page, auth) {
  await page.goto(`${portal}/login`, { waitUntil: "networkidle2" });
  await page.evaluate(({ token, user }) => {
    localStorage.setItem("coro_client_token", token);
    localStorage.setItem("coro_client_user", JSON.stringify(user));
  }, auth);
}

await mkdir(output, { recursive: true });
const corporate = await login("portal-corporate-a@global-e2e.test");
const before = await call("/client-portal/network/management-context", { token: corporate.token });
if (before.status !== 200) throw new Error(`Corporate management context unavailable: ${before.status}`);
const userId = "70000000-0000-4000-8000-000000000002";
const successorId = "70000000-0000-4000-8000-000000000004";
const buildingId = "40000000-0000-4000-8000-000000000002";
const delegated = await call("/client-portal/network/assignments", {
  method: "POST", token: corporate.token,
  body: { subjectType: "CLIENT_USER", clientUserId: userId, scope: "BUILDING", buildingId, permissions: ["NETWORK_SUPERVISION_READ"], reason: "P-6.1 browser delegation evidence" },
});
if (delegated.status !== 201) throw new Error(`Browser delegation setup failed: ${delegated.status} ${JSON.stringify(delegated.data)}`);
const succeeded = await call(`/client-portal/network/assignments/${delegated.data.id}/succeed`, {
  method: "POST", token: corporate.token,
  body: { successorClientUserId: successorId, effectiveFrom: new Date(Date.now() + 2000).toISOString(), lockVersion: delegated.data.lockVersion, reason: "P-6.1 governed succession evidence" },
});
if (succeeded.status !== 201) throw new Error(`Browser succession setup failed: ${succeeded.status} ${JSON.stringify(succeeded.data)}`);

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const results = [];
const consoleErrors = [];
try {
  const viewports = [[1440, 900], [1920, 1080], [390, 844], [430, 932]];
  const themes = [
    { id: "classic", ui: "legacy", preference: "LIGHT", expectedUi: "legacy", expectedTheme: "light" },
    { id: "glass-light", ui: "glass", preference: "LIGHT", expectedUi: "glass", expectedTheme: "light" },
    { id: "glass-dark", ui: "glass", preference: "DARK", expectedUi: "glass", expectedTheme: "dark" },
  ];
  const page = await browser.newPage();
  page.on("console", (entry) => { if (entry.type() === "error") consoleErrors.push(entry.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await installSession(page, corporate);
  for (const [width, height] of viewports) {
    for (const theme of themes) {
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      await page.evaluate(({ ui, preference }) => {
        localStorage.setItem("coro-ui-generation", ui);
        localStorage.setItem("coro-theme-preference", preference);
      }, theme);
      await page.goto(`${portal}/network/administration`, { waitUntil: "networkidle2" });
      await page.waitForSelector("main h1", { timeout: 10000 });
      await page.waitForFunction(() => document.querySelectorAll("article").length > 0, { timeout: 10000 });
      const measured = await page.evaluate(() => {
        const root = document.documentElement;
        const viewport = { width: innerWidth, height: innerHeight };
        const selectors = ["main", "header", "section", "form", "fieldset", "article", "button", "select", "textarea"];
        const geometry = selectors.flatMap((selector) => [...document.querySelectorAll(selector)].map((element) => {
          const rect = element.getBoundingClientRect();
          return { selector, left: rect.left, right: rect.right, width: rect.width, visible: rect.width > 0 && rect.height > 0 };
        }));
        const overflow = geometry.filter((item) => item.visible && (item.left < -1 || item.right > viewport.width + 1));
        return {
          viewport,
          ui: root.getAttribute("data-ui"),
          theme: root.getAttribute("data-theme"),
          globalOverflow: root.scrollWidth > root.clientWidth + 1,
          overflow,
          heading: document.querySelector("main h1")?.textContent || "",
          cards: document.querySelectorAll("article").length,
          focusable: document.querySelectorAll("button,select,textarea,input,a[href]").length,
        };
      });
      const pass = measured.viewport.width === width && measured.viewport.height === height && measured.ui === theme.expectedUi && measured.theme === theme.expectedTheme && !measured.globalOverflow && measured.overflow.length === 0 && measured.cards > 0;
      const id = `${width}x${height}-${theme.id}`;
      await page.screenshot({ path: join(output, `${id}.png`), fullPage: true });
      results.push({ id, status: pass ? "PASS" : "FAIL", ...measured });
    }
  }
  await page.reload({ waitUntil: "networkidle2" });
  const f5 = await page.evaluate(() => ({ authenticated: location.pathname === "/network/administration", hasCards: document.querySelectorAll("article").length > 0 }));
  results.push({ id: "f5-session", status: f5.authenticated && f5.hasCards ? "PASS" : "FAIL", ...f5 });

  for (const [id, email] of [["no-assignment", "portal-zero-a@global-e2e.test"], ["cross-tenant", "portal-corporate-b@global-e2e.test"]]) {
    const auth = await login(email);
    const direct = await call("/client-portal/network/management-context", { token: auth.token });
    const isolated = await browser.newPage();
    await installSession(isolated, auth);
    await isolated.goto(`${portal}/network/administration`, { waitUntil: "networkidle2" });
    const browserDenied = await isolated.evaluate(() => Boolean(document.querySelector('[role="alert"]')) && !document.querySelector("form"));
    results.push({ id, status: direct.status === 403 && browserDenied ? "PASS" : "FAIL", httpStatus: direct.status, browserDenied });
    await isolated.close();
  }
  const revoked = await call(`/client-portal/network/assignments/${succeeded.data.successor.id}/revoke`, {
    method: "POST", token: corporate.token,
    body: { lockVersion: succeeded.data.successor.lockVersion, reason: "P-6.1 governed revocation evidence" },
  });
  results.push({ id: "explicit-revocation", status: revoked.status === 201 && revoked.data?.status === "REVOKED" ? "PASS" : "FAIL", httpStatus: revoked.status });
  const lastManager = await call("/client-portal/network/assignments/86000000-0000-4000-8000-000000000001/revoke", {
    method: "POST", token: corporate.token,
    body: { lockVersion: 0, reason: "P-6.1 last manager protection evidence" },
  });
  results.push({ id: "last-manager-protection", status: lastManager.status === 409 ? "PASS" : "FAIL", httpStatus: lastManager.status });
} finally {
  await browser.close();
}
const sanitizedErrors = [...new Set(consoleErrors)].filter((message) => !/favicon|Failed to load resource.*403/i.test(message));
const report = { generatedAt: new Date().toISOString(), results, consoleErrors: sanitizedErrors, pass: results.every((item) => item.status === "PASS") && sanitizedErrors.length === 0 };
await writeFile(join(output, "browser-matrix.json"), JSON.stringify(report, null, 2));
console.log(`P61_BROWSER_MATRIX_${report.pass ? "PASS" : "FAIL"}: ${results.filter((item) => item.status === "PASS").length}/${results.length}`);
if (!report.pass) process.exitCode = 1;
