#!/usr/bin/env node
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { resolveExerciseRexRuntime } from "../global-e2e/src/exercise-rex-runtime.mjs";
import { loadSecretStore } from "../global-e2e/src/secret-store.mjs";
import { startMfaCaptureAdapter } from "../global-e2e/src/mfa-capture-adapter.mjs";
import { QaIdentityLab } from "../global-e2e/src/browser-orchestration.mjs";

const require = createRequire(join(resolve("coro-backend"), "package.json"));
const puppeteer = require("puppeteer");
const runtime = resolveExerciseRexRuntime();
const secrets = await loadSecretStore();
const adapter = await startMfaCaptureAdapter({ captureDirectory: runtime.mfaDirectory, channelToken: secrets.mfaChannelToken });
const lab = new QaIdentityLab({ apiUrl: runtime.apiUrl, portalUrl: runtime.portalUrl, frontendUrl: runtime.portalUrl, password: secrets.syntheticPassword, mfaAdapterUrl: adapter.url, mfaChannelToken: secrets.mfaChannelToken });
const output = runtime.evidenceDirectory;
const building = "40000000-0000-4000-8000-000000000001";
const routes = [
  ["dashboard", "/dashboard", /tableau de bord|bienvenue/i], ["buildings", "/buildings", /bâtiment/i],
  ["activities", "/activities", /calendrier des activités/i], ["notifications", "/notifications", /notifications|tout est à jour/i],
  ["profile", "/profile", /profil|mot de passe/i], ["manual", "/manual", /manuel d’utilisation/i],
  ["map", "/map", /carte|bâtiment/i], ["offline", "/offline-documents", /hors ligne|coffre/i],
  ["sentinelle", `/sentinelle/${building}`, /sentinelle/i], ["employees", `/sentinelle/${building}/employes`, /employé/i],
  ["invitations", `/sentinelle/${building}/invitations`, /invitation/i], ["history", `/sentinelle/${building}/historique`, /historique/i],
  ["reports", `/sentinelle/${building}/rapports`, /rapport/i],
];
function geometry() {
  const root = document.documentElement;
  const nodes = [...document.querySelectorAll("main,main section,main article,main table,main form,main button,main input,main select,header")].map(element => {
    const box = element.getBoundingClientRect();
    return { tag: element.tagName, left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height };
  }).filter(box => box.width > 0 && box.height > 0);
  return { viewport: { width: innerWidth, height: innerHeight }, globalOverflow: root.scrollWidth > root.clientWidth + 1, componentOverflow: nodes.filter(box => box.left < -1 || box.right > innerWidth + 1), text: document.body.innerText };
}

function normalizeText(value) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

await mkdir(output, { recursive: true });
const auth = await lab.loginAs("clientCorporateA");
const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const report = { schemaVersion: 1, completedAt: null, combinations: [], errorStates: [], sessionLifecycle: null, externalRequestsBlocked: [] };
try {
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  await page.setBypassServiceWorker(true);
  await page.setRequestInterception(true);
  const denyExternal = request => {
    const url = request.url();
    if (!url.startsWith(new URL(runtime.portalUrl).origin) && !url.startsWith(new URL(runtime.apiUrl).origin) && !url.startsWith("data:") && !url.startsWith("blob:")) {
      report.externalRequestsBlocked.push(url.replace(/[?#].*$/, ""));
      request.abort();
    } else request.continue();
  };
  page.on("request", denyExternal);
  const viewports = [[1440, 900], [1920, 1080], [390, 844], [430, 932]];
  const themes = [{ id: "classic", ui: "legacy", preference: "LIGHT" }, { id: "glass-light", ui: "glass", preference: "LIGHT" }, { id: "glass-dark", ui: "glass", preference: "DARK" }];
  if (process.env.CORO_QA_ERROR_STATES_ONLY !== "1") for (const [width, height] of viewports) for (const theme of themes) {
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.goto(`${runtime.portalUrl}/login`, { waitUntil: "domcontentloaded" });
    await page.evaluate(({ token, user, ui, preference }) => {
      localStorage.setItem("coro_client_token", token);
      localStorage.setItem("coro_client_user", JSON.stringify(user));
      localStorage.setItem("coro-ui-generation", ui);
      localStorage.setItem("coro-theme-preference", preference);
    }, { token: auth.token, user: auth.user, ui: theme.ui, preference: theme.preference });
    const routeResults = [];
    for (const [id, path, expected] of routes) {
      await page.goto(`${runtime.portalUrl}${path}`, { waitUntil: "domcontentloaded", timeout: 15_000 });
      await new Promise(resolveWait => setTimeout(resolveWait, 700));
      const measured = await page.evaluate(geometry);
      routeResults.push({ id, pass: expected.test(measured.text) && !measured.globalOverflow && measured.componentOverflow.length === 0, globalOverflow: measured.globalOverflow, componentOverflow: measured.componentOverflow.slice(0, 5) });
    }
    const id = `${width}x${height}-${theme.id}`;
    await page.screenshot({ path: join(output, `${id}.png`), fullPage: true });
    report.combinations.push({ id, viewport: { width, height }, theme: theme.id, status: routeResults.every(result => result.pass) ? "PASS" : "FAIL", routes: routeResults });
  }

  for (const [id, path, apiFragment, message] of [
    ["activities-error", "/activities", "/client-portal/activities", "Impossible de charger les activités"],
    ["notifications-error", "/notifications", "/client-portal/notifications", "Impossible de charger les notifications"],
    ["map-error", "/map", "/client-portal/buildings", "Impossible de charger la carte"],
    ["bookings-error", "/bookings", "/client-portal/bookings", "Impossible de charger les réservations"],
  ]) {
    await page.goto(`${runtime.portalUrl}/login`, { waitUntil: "domcontentloaded" });
    await page.evaluate(({ token, user }) => {
      localStorage.setItem("coro_client_token", token);
      localStorage.setItem("coro_client_user", JSON.stringify(user));
    }, { token: auth.token, user: auth.user });
    page.off("request", denyExternal);
    await page.setRequestInterception(false);
    await page.setRequestInterception(true);
    const observedRequests = [];
    const handler = request => {
      observedRequests.push(request.url());
      return request.url().includes(apiFragment) ? request.respond({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Synthetic outage" }) }) : request.continue();
    };
    page.on("request", handler);
    await page.goto(`${runtime.portalUrl}${path}`, { waitUntil: "domcontentloaded" });
    await new Promise(resolveWait => setTimeout(resolveWait, 700));
    const text = normalizeText(await page.evaluate(() => document.body.innerText));
    const messageVisible = text.includes(normalizeText(message));
    const retryVisible = text.includes("reessayer");
    report.errorStates.push({ id, status: messageVisible && retryVisible ? "PASS" : "FAIL", messageVisible, retryVisible, observedText: text.slice(0, 500), observedRequests: observedRequests.map(url => url.replace(/[?#].*$/, "")) });
    page.off("request", handler);
    page.on("request", denyExternal);
  }
  await page.goto(`${runtime.portalUrl}/login`, { waitUntil: "domcontentloaded" });
  await page.evaluate(({ token, user }) => {
    localStorage.setItem("coro_client_token", token);
    localStorage.setItem("coro_client_user", JSON.stringify(user));
  }, { token: auth.token, user: auth.user });
  await page.goto(`${runtime.portalUrl}/profile`, { waitUntil: "domcontentloaded" });
  await page.reload({ waitUntil: "domcontentloaded" });
  await new Promise(resolveWait => setTimeout(resolveWait, 700));
  const persistedAfterReload = await page.evaluate(() => Boolean(localStorage.getItem("coro_client_token")));
  const clickedLogout = await page.$$eval("button", buttons => {
    const target = buttons.find(button => button.textContent?.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().includes("deconnexion"));
    target?.click();
    return Boolean(target);
  });
  await new Promise(resolveWait => setTimeout(resolveWait, 500));
  const tokenCleared = await page.evaluate(() => !localStorage.getItem("coro_client_token") && !localStorage.getItem("coro_client_user"));
  report.sessionLifecycle = { status: persistedAfterReload && clickedLogout && tokenCleared && new URL(page.url()).pathname === "/login" ? "PASS" : "FAIL", persistedAfterReload, clickedLogout, tokenCleared, finalPath: new URL(page.url()).pathname };
  report.completedAt = new Date().toISOString();
  report.externalRequestsBlocked = [...new Set(report.externalRequestsBlocked)];
  report.pass = report.combinations.every(item => item.status === "PASS") && report.errorStates.every(item => item.status === "PASS") && report.sessionLifecycle?.status === "PASS";
  await writeFile(join(output, "portal-browser-inventory.json"), JSON.stringify(report, null, 2));
  console.log(`PORTAL_BROWSER_INVENTORY_${report.pass ? "PASS" : "FAIL"}: ${report.combinations.filter(item => item.status === "PASS").length}/12`);
  if (!report.pass) process.exitCode = 1;
} finally {
  await browser.close();
  await lab.logout("clientCorporateA").catch(() => undefined);
  await adapter.close();
}
