#!/usr/bin/env node
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { QaIdentityLab } from "./browser-orchestration.mjs";
import { loadSecretStore } from "./secret-store.mjs";
import { startMfaCaptureAdapter } from "./mfa-capture-adapter.mjs";
import { assertUnderQaRoot } from "./policy.mjs";

const root = resolve(fileURLToPath(new URL("../../../", import.meta.url)));
const require = createRequire(join(root, "coro-backend/package.json"));
const puppeteer = require("puppeteer");
const evidenceRoot = assertUnderQaRoot(
  process.env.CORO_QA_INCIDENT_AUTH_BROWSER_EVIDENCE ||
    "D:\\CORO-QA\\tracking\\organization-incident-authorizations\\browser",
);
const secrets = await loadSecretStore();
const adapter = await startMfaCaptureAdapter({
  captureDirectory: process.env.CORO_QA_MFA_DIR,
  channelToken: secrets.mfaChannelToken,
});
const lab = new QaIdentityLab({
  apiUrl: process.env.CORO_QA_BACKEND_URL,
  portalUrl: process.env.CORO_QA_PORTAL_URL,
  frontendUrl: process.env.CORO_QA_FRONTEND_URL,
  password: secrets.syntheticPassword,
  mfaAdapterUrl: adapter.url,
  mfaChannelToken: secrets.mfaChannelToken,
});
const viewports = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
  { width: 2560, height: 1440 },
];
const themes = [
  { name: "classic", ui: "legacy", preference: "LIGHT" },
  { name: "glass-light", ui: "glass", preference: "LIGHT" },
  { name: "glass-dark", ui: "glass", preference: "DARK" },
];
const report = {
  sha: process.env.CORO_QA_COMMIT_SHA,
  executedAt: new Date().toISOString(),
  matrix: [],
  checks: [],
  consoleErrors: [],
  injectedFailureConsole: [],
  limitations: [
    {
      id: "real-screen-reader",
      status: "NOT_VERIFIED",
      reason: "Aucun lecteur d’écran réel fiable dans le harnais isolé.",
    },
  ],
};
const check = (id, pass, detail) =>
  report.checks.push({ id, status: pass ? "PASS" : "FAIL", detail });
let browser;
try {
  await mkdir(evidenceRoot, { recursive: true });
  const startedAt = Date.now();
  const email = "customer-admin-a@global-e2e.test";
  const login = await lab.call("/auth/login", {
    method: "POST",
    body: { email, password: secrets.syntheticPassword },
  });
  if (login.status >= 300 || !login.data?.mfaRequired)
    throw new Error(`ADMIN login preflight failed: HTTP ${login.status}`);
  const code = await lab.completeMfa(
    { email, key: "incident-auth-admin" },
    startedAt,
  );
  const verified = await lab.call("/auth/verify-mfa", {
    method: "POST",
    body: { email, code },
  });
  if (verified.status >= 300 || !verified.data?.access_token)
    throw new Error(`ADMIN MFA verification failed: HTTP ${verified.status}`);
  browser = await puppeteer.launch({ headless: true });
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  page.on("console", (event) => {
    if (event.type() === "error") report.consoleErrors.push(event.text());
  });
  page.on("pageerror", (error) => report.consoleErrors.push(error.message));
  await page.goto(process.env.CORO_QA_FRONTEND_URL, {
    waitUntil: "domcontentloaded",
  });
  await page.evaluate(
    ({ token, refresh, user }) => {
      localStorage.setItem("coro_token", token);
      localStorage.setItem("coro_user", JSON.stringify(user));
      localStorage.setItem("coro_refresh_token", refresh);
      sessionStorage.setItem("coro_token", token);
      sessionStorage.setItem("coro_user", JSON.stringify(user));
      sessionStorage.setItem("coro_refresh_token", refresh);
    },
    { token: verified.data.access_token, refresh: verified.data.refresh_token, user: verified.data.user },
  );
  for (const viewport of viewports)
    for (const theme of themes) {
      await page.setViewport(viewport);
      await page.evaluate(({ ui, preference }) => {
        localStorage.setItem("coro-ui-generation", ui);
        localStorage.setItem("coro-theme-preference", preference);
        localStorage.setItem("coro-glass-beta", "production-preview");
      }, theme);
      await page.goto(
        `${process.env.CORO_QA_FRONTEND_URL}/clients/30000000-0000-4000-8000-000000000001`,
        { waitUntil: "networkidle0" },
      );
    await new Promise((done) => setTimeout(done, 1_000));
    const loaded = await page.evaluate(() => ({
      url: location.href,
      text: document.body.innerText,
    }));
    if (!loaded.text.includes("Autorisations Incident")) {
      await page.screenshot({ path: join(evidenceRoot, "incident-authorizations-load-failure.png"), fullPage: true });
      throw new Error(`Incident authorization panel unavailable at ${loaded.url}: ${loaded.text.slice(0, 800)}`);
    }
      const state = await page.evaluate(() => {
        const panel = document
          .getElementById("incident-authority-title")
          ?.closest("section");
        if (!panel) throw new Error("Incident authorization panel missing");
        const controls = [
          ...panel.querySelectorAll(
            "button,input:not([type='checkbox']),select",
          ),
        ].filter((node) => {
          const box = node.getBoundingClientRect();
          return box.width > 0 && box.height > 0;
        });
        const labels = document.body.innerText;
        return {
          overflow:
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth + 1,
          clipped: controls.filter((node) => {
            const box = node.getBoundingClientRect();
            return box.left < -1 || box.right > innerWidth + 1;
          }).length,
          shortTargets: controls.filter(
            (node) => node.getBoundingClientRect().height < 44,
          ).length,
          hasDoubleGate: labels.includes("deux niveaux"),
          hasReason: labels.includes("Motif de modification"),
          hasGrant: labels.includes("Nouvelle affectation"),
          hasRevoke: labels.includes("Affectations et accès effectif"),
        };
      });
      const id = `${viewport.width}x${viewport.height}-${theme.name}`;
      const pass =
        !state.overflow &&
        state.clipped === 0 &&
        state.shortTargets === 0 &&
        state.hasDoubleGate &&
        state.hasReason &&
        state.hasGrant &&
        state.hasRevoke;
      report.matrix.push({ id, status: pass ? "PASS" : "FAIL", ...state });
      await page.screenshot({
        path: join(evidenceRoot, `incident-authorizations-${id}.png`),
        fullPage: true,
      });
    }
  await page.reload({ waitUntil: "networkidle0" });
  check(
    "f5",
    await page.evaluate(() =>
      document.body.innerText.includes("Autorisations Incident"),
    ),
    "session et écran conservés",
  );
  const cdp = await page.createCDPSession();
  await cdp.send("Emulation.setPageScaleFactor", { pageScaleFactor: 2 });
  check(
    "zoom-200",
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth + 1,
    ),
    "aucun débordement horizontal",
  );
  await cdp.send("Emulation.setPageScaleFactor", { pageScaleFactor: 1 });
  check(
    "keyboard-focus",
    await page.evaluate(() => {
      const panel = document
        .getElementById("incident-authority-title")
        ?.closest("section");
      const control = panel?.querySelector("button,select,input");
      if (!(control instanceof HTMLElement)) return false;
      control.focus();
      return document.activeElement === control;
    }),
    "un contrôle Incident reçoit le focus clavier",
  );
  await page.setRequestInterception(true);
  const injectedFailureConsoleStart = report.consoleErrors.length;
  const failIncidentLoad = (request) => {
    if (
      request.method() === "GET" &&
      request.url().includes("/incident-authorizations")
    )
      void request.respond({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ message: "Panne QA déterministe" }),
      });
    else void request.continue();
  };
  page.on("request", failIncidentLoad);
  await page.reload({ waitUntil: "networkidle0" });
  check(
    "visible-503-no-false-success",
    await page.evaluate(() =>
      document.body.innerText.includes(
        "Impossible de charger les autorisations Incident",
      ),
    ),
    "erreur visible sans liste vide présentée comme un succès",
  );
  report.injectedFailureConsole = report.consoleErrors.slice(
    injectedFailureConsoleStart,
  );
  report.consoleErrors.splice(injectedFailureConsoleStart);
  page.off("request", failIncidentLoad);
  await page.setRequestInterception(false);
  await page.reload({ waitUntil: "networkidle0" });
  check(
    "503-recovery",
    await page.evaluate(() =>
      document.body.innerText.includes("Nouvelle affectation"),
    ),
    "reprise après rétablissement",
  );
  check(
    "matrix-12-of-12",
    report.matrix.length === 12 &&
      report.matrix.every((row) => row.status === "PASS"),
    `${report.matrix.filter((row) => row.status === "PASS").length}/12`,
  );
  check(
    "no-critical-console-errors",
    report.consoleErrors.length === 0,
    JSON.stringify(report.consoleErrors),
  );
  await context.close();
} finally {
  if (browser) await browser.close().catch(() => undefined);
  await adapter.close().catch(() => undefined);
}
report.pass =
  report.checks.every((item) => item.status === "PASS") &&
  report.matrix.every((item) => item.status === "PASS");
await writeFile(
  join(evidenceRoot, "browser-acceptance.json"),
  JSON.stringify(report, null, 2),
);
console.log(
  JSON.stringify(
    {
      pass: report.pass,
      matrix: report.matrix,
      checks: report.checks,
      limitations: report.limitations,
    },
    null,
    2,
  ),
);
if (!report.pass) process.exitCode = 1;
