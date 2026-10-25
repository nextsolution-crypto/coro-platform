#!/usr/bin/env node
import { createRequire } from "node:module";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const require = createRequire(join(resolve("coro-backend"), "package.json"));
const puppeteer = require("puppeteer");
const api = (process.env.CORO_QA_BACKEND_URL || "http://127.0.0.1:3166/api").replace(/\/$/, "");
const portal = (process.env.CORO_QA_PORTAL_URL || "http://127.0.0.1:3167").replace(/\/$/, "");
const password = process.env.CORO_QA_SYNTHETIC_PASSWORD;
const mfaDirectory = process.env.CORO_QA_MFA_DIR;
const output = process.env.CORO_QA_BROWSER_EVIDENCE;
if (!password || !mfaDirectory || !output) throw new Error("Browser QA configuration incomplete");

async function call(route, options = {}) {
  const response = await fetch(`${api}${route}`, { method: options.method || "GET", headers: { "content-type": "application/json" }, body: options.body === undefined ? undefined : JSON.stringify(options.body) });
  const text = await response.text(); let data = text; try { data = JSON.parse(text); } catch {}
  return { status: response.status, data };
}
async function code(email, after) {
  const files = await Promise.all((await readdir(mfaDirectory)).map(async name => ({ name, time: (await stat(join(mfaDirectory, name))).mtimeMs })));
  for (const file of files.sort((a,b) => b.time-a.time)) {
    if (file.time < after - 2000) break;
    const message = JSON.parse(await readFile(join(mfaDirectory, file.name), "utf8"));
    if (String(message.to).toLowerCase() === email) return /\b(\d{6})\b/.exec(message.subject)?.[1];
  }
  throw new Error(`MFA capture missing for ${email}`);
}
async function login(email) {
  const after = Date.now(); const challenge = await call("/client-auth/login", { method: "POST", body: { email, password } });
  if (challenge.status !== 201) throw new Error(`Challenge failed ${email}: ${challenge.status}`);
  const verified = await call("/client-auth/verify-mfa", { method: "POST", body: { email, code: await code(email, after) } });
  if (verified.status !== 201) throw new Error(`MFA failed ${email}: ${verified.status}`);
  return verified.data;
}
async function install(page, auth) {
  await page.goto(`${portal}/login`, { waitUntil: "domcontentloaded" });
  await page.evaluate(({ token, user }) => { localStorage.setItem("coro_client_token", token); localStorage.setItem("coro_client_user", JSON.stringify(user)); }, auth);
}
function geometry() {
  const root = document.documentElement;
  const selectors = ["main", "header", "section", "div", "button", "select", "input", "article"];
  const elements = selectors.flatMap(selector => [...document.querySelectorAll(selector)].map(element => {
    const r = element.getBoundingClientRect(); return { selector, left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height, visible: r.width > 0 && r.height > 0 };
  }));
  return { viewport: { width: innerWidth, height: innerHeight }, globalOverflow: root.scrollWidth > root.clientWidth + 1, failures: elements.filter(x => x.visible && (x.left < -1 || x.right > innerWidth + 1)), heading: document.querySelector("main h1")?.textContent || "", text: document.body.innerText };
}

await mkdir(output, { recursive: true });
const manager = await login("portal-local-a@global-e2e.test");
const corporate = await login("portal-corporate-a@global-e2e.test");
const zero = await login("portal-zero-a@global-e2e.test");
const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const results = []; const consoleErrors = [];
try {
  const page = await browser.newPage();
  page.on("console", e => { if (e.type() === "error") consoleErrors.push(e.text()); });
  page.on("pageerror", e => consoleErrors.push(e.message));
  const viewports = [[1440,900],[1920,1080],[390,844],[430,932]];
  const themes = [{ id:"classic", ui:"legacy", preference:"LIGHT", expectedUi:"legacy", expectedTheme:"light" },{ id:"glass-light", ui:"glass", preference:"LIGHT", expectedUi:"glass", expectedTheme:"light" },{ id:"glass-dark", ui:"glass", preference:"DARK", expectedUi:"glass", expectedTheme:"dark" }];
  for (const [width,height] of viewports) for (const theme of themes) {
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await install(page, manager);
    await page.evaluate(({ui,preference}) => { localStorage.setItem("coro-ui-generation",ui); localStorage.setItem("coro-theme-preference",preference); }, theme);
    await page.goto(`${portal}/intelligence`, { waitUntil: "networkidle2" });
    await page.waitForSelector("main h1", { timeout: 10000 });
    const managerView = await page.evaluate(geometry);
    await install(page, corporate);
    await page.goto(`${portal}/intelligence`, { waitUntil: "networkidle2" });
    await page.waitForSelector("main h1", { timeout: 10000 });
    const corporateView = await page.evaluate(geometry);
    const root = await page.evaluate(() => ({ ui: document.documentElement.getAttribute("data-ui"), theme: document.documentElement.getAttribute("data-theme") }));
    const pass = /\b1\s+Bâtiment\b/.test(managerView.text) && /\b2\s+Bâtiments\b/.test(corporateView.text) && !managerView.globalOverflow && !corporateView.globalOverflow && managerView.failures.length === 0 && corporateView.failures.length === 0 && root.ui === theme.expectedUi && root.theme === theme.expectedTheme;
    const id = `${width}x${height}-${theme.id}`;
    await page.screenshot({ path: join(output, `${id}.png`), fullPage: true });
    results.push({ id, status: pass ? "PASS" : "FAIL", manager: { viewport: managerView.viewport, overflow: managerView.failures }, corporate: { viewport: corporateView.viewport, overflow: corporateView.failures }, ...root });
  }
  await install(page, zero); await page.goto(`${portal}/intelligence`, { waitUntil: "networkidle2" });
  const zeroView = await page.evaluate(geometry);
  results.push({ id: "no-building-scope", status: /\b0\s+Bâtiment\b/.test(zeroView.text) && !/Synthetic Building/i.test(zeroView.text) ? "PASS" : "FAIL" });
  await install(page, manager); await page.goto(`${portal}/intelligence`, { waitUntil: "networkidle2" }); await page.reload({ waitUntil: "networkidle2" });
  const refresh = await page.evaluate(geometry);
  results.push({ id: "f5-session", status: /\b1\s+Bâtiment\b/.test(refresh.text) ? "PASS" : "FAIL" });

  const statePage = await browser.newPage();
  await statePage.evaluateOnNewDocument(() => {
    const realFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      if (String(input).includes("/client-portal/intelligence/overview")) await new Promise(resolve => setTimeout(resolve, 2500));
      return realFetch(input, init);
    };
  });
  await install(statePage, manager); const navigation = statePage.goto(`${portal}/intelligence`, { waitUntil: "networkidle2" });
  await statePage.waitForFunction(() => document.body.innerText.includes("Analyse en cours"), { timeout: 10000 });
  const loadingText = await statePage.evaluate(() => document.body.innerText); await navigation;
  results.push({ id: "loading-state", status: loadingText.includes("Analyse en cours") ? "PASS" : "FAIL" }); await statePage.close();

  const errorPage = await browser.newPage();
  await errorPage.evaluateOnNewDocument(() => {
    const realFetch = window.fetch.bind(window);
    window.fetch = (input, init) => String(input).includes("/client-portal/intelligence/overview")
      ? Promise.resolve(new Response(JSON.stringify({ message: "synthetic failure" }), { status: 503, headers: { "content-type": "application/json" } }))
      : realFetch(input, init);
  });
  await install(errorPage, manager); await errorPage.goto(`${portal}/intelligence`, { waitUntil: "networkidle2" });
  const errorState = await errorPage.evaluate(() => ({ text: document.body.innerText, alert: Boolean(document.querySelector('[role="alert"]')) }));
  results.push({ id: "explicit-error-state", status: errorState.alert && /erreur|indisponible|réessayer/i.test(errorState.text) ? "PASS" : "FAIL", observed: errorState }); await errorPage.close();
} finally { await browser.close(); }
const filteredErrors = [...new Set(consoleErrors)].filter(x => !/favicon|Failed to load resource.*403/i.test(x));
const report = { generatedAt: new Date().toISOString(), commit: process.env.CORO_QA_COMMIT, results, consoleErrors: filteredErrors, pass: results.every(x => x.status === "PASS") && filteredErrors.length === 0 };
await writeFile(join(output, "browser-matrix.json"), JSON.stringify(report, null, 2));
console.log(`CP004_BROWSER_${report.pass ? "PASS" : "FAIL"}: ${results.filter(x => x.status === "PASS").length}/${results.length}`);
if (!report.pass) process.exitCode = 1;
