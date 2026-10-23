#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { resolveExerciseRexRuntime } from "./exercise-rex-runtime.mjs";
import { loadSecretStore } from "./secret-store.mjs";
import { startMfaCaptureAdapter } from "./mfa-capture-adapter.mjs";
import { QaIdentityLab } from "./browser-orchestration.mjs";

const viewports = [[1440, 900], [1920, 1080], [390, 844], [430, 932]];
const themes = [
  { id: "classic", ui: "legacy", preference: "LIGHT", expectedUi: "legacy", expectedTheme: "light" },
  { id: "glass-light", ui: "glass", preference: "LIGHT", expectedUi: "glass", expectedTheme: "light" },
  { id: "glass-dark", ui: "glass", preference: "DARK", expectedUi: "glass", expectedTheme: "dark" },
];

function measureKnowledge() {
  const visible = (element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  };
  const nodes = [...document.querySelectorAll("main,nav,header,section,article,aside,form,button,a,textarea")].filter(visible);
  const geometry = nodes.map((element) => {
    const rect = element.getBoundingClientRect();
    const parent = element.parentElement?.getBoundingClientRect();
    const parentOverflow = element.parentElement ? getComputedStyle(element.parentElement).overflowX : "visible";
    return {
      selector: element.id ? `#${element.id}` : element.tagName.toLowerCase(),
      left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
      width: rect.width, height: rect.height,
      viewportOverflow: rect.left < -1 || rect.right > innerWidth + 1,
      parentOverflow: Boolean(parent && parentOverflow !== "auto" && parentOverflow !== "scroll" && (rect.left < parent.left - 2 || rect.right > parent.right + 2)),
      clippedAction: ["BUTTON", "A"].includes(element.tagName) && (rect.height < 44 || rect.width < 44),
    };
  });
  return {
    viewport: { width: innerWidth, height: innerHeight },
    ui: document.documentElement.getAttribute("data-ui"),
    theme: document.documentElement.getAttribute("data-theme"),
    globalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    failures: geometry.filter((item) => item.viewportOverflow || item.parentOverflow || item.clippedAction),
    heading: document.querySelector("main h1")?.textContent ?? "",
    status: document.querySelector("[aria-live='polite']")?.textContent ?? "",
    citationHref: document.querySelector("[aria-label='Sources canoniques'] a")?.getAttribute("href") ?? null,
  };
}

const runtime = resolveExerciseRexRuntime();
const secrets = await loadSecretStore();
const adapter = await startMfaCaptureAdapter({ captureDirectory: runtime.mfaDirectory, channelToken: secrets.mfaChannelToken });
const lab = new QaIdentityLab({ apiUrl: runtime.apiUrl, portalUrl: runtime.portalUrl, frontendUrl: runtime.portalUrl, password: secrets.syntheticPassword, mfaAdapterUrl: adapter.url, mfaChannelToken: secrets.mfaChannelToken });
const evidenceDirectory = join(runtime.evidenceDirectory, "browser");
await mkdir(evidenceDirectory, { recursive: true });
const isolated = await lab.createIsolatedSession("clientCorporateA");
const { page, context, browser } = isolated;
const consoleErrors = [];
page.on("console", (entry) => { if (entry.type() === "error") consoleErrors.push(entry.text()); });
page.on("pageerror", (error) => consoleErrors.push(error.message));
const results = [];

try {
  for (const [width, height] of viewports) {
    for (const theme of themes) {
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      await page.goto(`${runtime.portalUrl}/knowledge`, { waitUntil: "networkidle2" });
      await page.evaluate(({ ui, preference }) => {
        localStorage.setItem("coro-ui-generation", ui);
        localStorage.setItem("coro-theme-preference", preference);
      }, theme);
      await page.reload({ waitUntil: "networkidle2" });
      await page.waitForSelector("#knowledge-input", { visible: true, timeout: 15000 });
      await page.type("#knowledge-input", "Ou se trouve la vanne principale?");
      await page.click("form button[type='submit']");
      await page.waitForSelector("[aria-label='Sources canoniques'] a", { visible: true, timeout: 15000 });
      const geometry = await page.evaluate(measureKnowledge);
      const id = `${width}x${height}-${theme.id}`;
      await page.screenshot({ path: join(evidenceDirectory, `${id}.png`), fullPage: true });
      await page.reload({ waitUntil: "networkidle2" });
      const sessionPersistent = await page.evaluate(() => Boolean(localStorage.getItem("coro_client_token")) && Boolean(document.querySelector("#knowledge-input")));
      const pass = geometry.viewport.width === width && geometry.viewport.height === height && geometry.ui === theme.expectedUi && geometry.theme === theme.expectedTheme &&
        !geometry.globalOverflow && geometry.failures.length === 0 && geometry.heading.includes("documents approuvés") && geometry.status.includes("ANSWERED") &&
        geometry.citationHref?.startsWith("/documents/") && sessionPersistent;
      results.push({ id, status: pass ? "PASS" : "FAIL", geometry, sessionPersistent });
    }
  }
} finally {
  await context.close();
  if (isolated.ownedBrowser) await browser.close();
  await adapter.close();
}

const criticalErrors = [...new Set(consoleErrors)].filter((message) => !/favicon|Failed to load resource.*404/i.test(message));
const report = {
  completedAt: new Date().toISOString(),
  status: results.length === 12 && results.every((item) => item.status === "PASS") && criticalErrors.length === 0 ? "PASS" : "FAIL",
  measuredConfigurations: results.length,
  results,
  criticalErrors,
};
await writeFile(join(evidenceDirectory, "knowledge-browser-matrix.json"), JSON.stringify(report, null, 2));
process.stdout.write(`${JSON.stringify({ status: report.status, measuredConfigurations: report.measuredConfigurations, failures: results.filter((item) => item.status === "FAIL").map((item) => item.id), criticalErrorCount: criticalErrors.length }, null, 2)}\n`);
if (report.status !== "PASS") process.exitCode = 1;
