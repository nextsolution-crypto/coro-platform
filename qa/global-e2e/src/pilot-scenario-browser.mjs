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
  process.env.CORO_QA_PILOT_EVIDENCE ||
    "D:\\CORO-QA\\runs\\tour-premont-pilot\\browser",
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
  sha: process.env.CORO_QA_COMMIT_SHA || "WORKTREE",
  executedAt: new Date().toISOString(),
  matrix: [],
  checks: [],
  consoleErrors: [],
  limitations: [
    {
      id: "real-screen-reader",
      status: "NOT_VERIFIED",
      reason: "Aucun lecteur d’écran réel n’est piloté par ce harnais Chrome.",
    },
  ],
};
const record = (id, pass, detail) =>
  report.checks.push({ id, status: pass ? "PASS" : "FAIL", detail });
const findButton = async (page, label) =>
  page.evaluateHandle((text) => {
    const button = [...document.querySelectorAll("button")].find(
      (entry) => entry.textContent?.trim() === text,
    );
    if (!button) throw new Error(`Button missing: ${text}`);
    return button;
  }, label);
const login = async (email, key) => {
  const startedAt = Date.now();
  const challenge = await lab.call("/auth/login", {
    method: "POST",
    body: { email, password: secrets.syntheticPassword },
  });
  if (challenge.status >= 300 || !challenge.data?.mfaRequired)
    throw new Error(`${key} login failed: HTTP ${challenge.status}`);
  const code = await lab.completeMfa({ email, key }, startedAt);
  const verified = await lab.call("/auth/verify-mfa", {
    method: "POST",
    body: { email, code },
  });
  if (verified.status >= 300 || !verified.data?.access_token)
    throw new Error(`${key} MFA failed: HTTP ${verified.status}`);
  return verified.data;
};

let browser;
try {
  await mkdir(evidenceRoot, { recursive: true });
  const anonymous = await lab.call("/admin/v1/test-scenario-pilots", {
    method: "GET",
  });
  record(
    "anonymous-denied",
    anonymous.status === 401,
    `HTTP ${anonymous.status}`,
  );
  const advisor = await login("advisor-a@global-e2e.test", "pilot-advisor");
  const advisorDenied = await lab.call("/admin/v1/test-scenario-pilots", {
    method: "GET",
    token: advisor.access_token,
  });
  record(
    "non-superadmin-denied",
    advisorDenied.status === 403,
    `HTTP ${advisorDenied.status}`,
  );
  const founder = await login("founder@global-e2e.test", "pilot-founder");

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
    {
      token: founder.access_token,
      refresh: founder.refresh_token,
      user: founder.user,
    },
  );
  const route = `${process.env.CORO_QA_FRONTEND_URL}/admin/test-scenario-pilots`;
  await page.goto(route, { waitUntil: "networkidle0" });
  await page.waitForFunction(() =>
    document.body.innerText.includes("Test Scenario Pilot"),
  );
  record(
    "eligible-demo-target-visible",
    await page.evaluate(() => document.body.innerText.includes("CORO Demo QA")),
    "La cible provient de l’endpoint gouverné.",
  );

  const initialText = await page.evaluate(() => document.body.innerText);
  if (initialText.includes("Nouvelle exécution")) {
    const button = await findButton(page, "Nouvelle exécution");
    await button.click();
  } else if (initialText.includes("Démarrer QA")) {
    const button = await findButton(page, "Démarrer QA");
    await button.click();
  }
  await page.waitForFunction(() =>
    document.body.innerText.includes("Clôturer cette exécution"),
  );
  const resultSelect = await page.$('select[aria-label^="Résultat :"]');
  if (!resultSelect) throw new Error("Pilot result selector missing.");
  await resultSelect.select("PASS");
  await page.waitForFunction(() => document.body.innerText.includes("1/"));
  const noteInput = await page.$('input[aria-label^="Note :"]');
  if (!noteInput) throw new Error("Pilot evidence note missing.");
  await noteInput.type("Preuve navigateur QA — backend et PostgreSQL réels");
  await noteInput.press("Tab");
  await page.waitForFunction(() => {
    const button = [...document.querySelectorAll("button")].find(
      (entry) => entry.textContent?.trim() === "Clôturer cette exécution",
    );
    return button && !button.disabled;
  });
  const closeButton = await findButton(page, "Clôturer cette exécution");
  await closeButton.click();
  await page.waitForFunction(() => document.body.innerText.includes("PARTIAL"));
  await page.reload({ waitUntil: "networkidle0" });
  const persisted = await page.evaluate(() => document.body.innerText);
  record(
    "check-and-note-persist-after-f5",
    persisted.includes("PARTIAL") &&
      persisted.includes("Preuve navigateur QA") &&
      persisted.includes("1/"),
    "Statut, preuve et synthèse persistent après F5.",
  );

  for (const viewport of viewports) {
    for (const theme of themes) {
      await page.setViewport(viewport);
      await page.evaluate(({ ui, preference }) => {
        localStorage.setItem("coro-ui-generation", ui);
        localStorage.setItem("coro-theme-preference", preference);
        localStorage.setItem("coro-glass-beta", "production-preview");
      }, theme);
      await page.goto(route, { waitUntil: "networkidle0" });
      const state = await page.evaluate(() => {
        const main = document.querySelector("main");
        const visibleControls = [
          ...(main?.querySelectorAll("button,input,select") ?? []),
        ].filter((node) => {
          const box = node.getBoundingClientRect();
          return box.width > 0 && box.height > 0;
        });
        return {
          overflow:
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth + 1,
          clipped: visibleControls.filter((node) => {
            const box = node.getBoundingClientRect();
            return box.left < -1 || box.right > innerWidth + 1;
          }).length,
          shortTargets: visibleControls.filter(
            (node) => node.getBoundingClientRect().height < 40,
          ).length,
          hasTitle: document.body.innerText.includes("Test Scenario Pilot"),
          hasSummary: document.body.innerText.includes("Contrôles"),
          hasPhases: document.body.innerText.includes("Fondation"),
        };
      });
      const id = `${viewport.width}x${viewport.height}-${theme.name}`;
      const pass =
        !state.overflow &&
        state.clipped === 0 &&
        state.hasTitle &&
        state.hasSummary &&
        state.hasPhases;
      report.matrix.push({ id, status: pass ? "PASS" : "FAIL", ...state });
      await page.screenshot({
        path: join(evidenceRoot, `pilot-${id}.png`),
        fullPage: true,
      });
    }
  }
  await page.bringToFront();
  await page.keyboard.press("Tab");
  record(
    "keyboard-focus",
    await page.evaluate(() => document.activeElement !== document.body),
    "La navigation clavier produit un focus actif.",
  );
  const cdp = await page.createCDPSession();
  await cdp.send("Emulation.setPageScaleFactor", { pageScaleFactor: 2 });
  record(
    "zoom-200",
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth + 1,
    ),
    "Aucun débordement horizontal à 200 % sur la configuration finale.",
  );
  report.status =
    report.matrix.every((entry) => entry.status === "PASS") &&
    report.checks.every((entry) => entry.status === "PASS") &&
    report.consoleErrors.length === 0
      ? "PASS"
      : "FAIL";
} finally {
  await browser?.close().catch(() => undefined);
  await adapter.close().catch(() => undefined);
  await mkdir(evidenceRoot, { recursive: true });
  await writeFile(
    join(evidenceRoot, "pilot-scenario-browser-report.json"),
    JSON.stringify(report, null, 2),
  );
}
if (report.status !== "PASS") {
  console.error(JSON.stringify(report, null, 2));
  process.exitCode = 1;
} else {
  console.log(
    JSON.stringify(
      {
        status: report.status,
        matrix: `${report.matrix.length}/${viewports.length * themes.length}`,
        checks: report.checks.length,
        evidenceRoot,
      },
      null,
      2,
    ),
  );
}
