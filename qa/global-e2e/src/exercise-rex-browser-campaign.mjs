import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const viewports = [[1440, 900], [1920, 1080], [390, 844], [430, 932]];
const themes = [
  { id: "classic", ui: "legacy", preference: "LIGHT", expectedUi: "legacy", expectedTheme: "light" },
  { id: "glass-light", ui: "glass", preference: "LIGHT", expectedUi: "glass", expectedTheme: "light" },
  { id: "glass-dark", ui: "glass", preference: "DARK", expectedUi: "glass", expectedTheme: "dark" },
];

function measure() {
  const visible = (element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  };
  const nodes = [...document.querySelectorAll("main,nav,header,section,article,form,dl,button,a,textarea")].filter(visible);
  const geometry = nodes.map((element) => {
    const rect = element.getBoundingClientRect();
    const parent = element.parentElement?.getBoundingClientRect();
    return { tag: element.tagName, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width,
      viewportOverflow: rect.left < -1 || rect.right > innerWidth + 1,
      parentOverflow: Boolean(parent && getComputedStyle(element.parentElement).overflowX !== "auto" && rect.right > parent.right + 2) };
  });
  return { viewport: { width: innerWidth, height: innerHeight }, ui: document.documentElement.getAttribute("data-ui"),
    theme: document.documentElement.getAttribute("data-theme"), globalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    failures: geometry.filter((item) => item.viewportOverflow || item.parentOverflow), heading: document.querySelector("main h1")?.textContent || "",
    linked: Boolean(document.querySelector('a[href*="/corrective-actions/"]')) };
}

export async function runExerciseRexBrowser({ runtime, lab, source, evidenceDirectory = join(runtime.evidenceDirectory, "browser") }) {
  await mkdir(evidenceDirectory, { recursive: true });
  const isolated = await lab.createIsolatedSession("clientLocalA");
  const { page, browser, context } = isolated;
  const browserErrors = [];
  const networkDiagnostics = [];
  page.on("console", (entry) => { if (entry.type() === "error") browserErrors.push(entry.text()); });
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("requestfailed", (request) => networkDiagnostics.push({ type: "request-failed", url: request.url(), error: request.failure()?.errorText || "unknown" }));
  page.on("response", (response) => {
    if (response.status() >= 400) networkDiagnostics.push({ type: "http", url: response.url(), status: response.status() });
  });
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("/api/")) networkDiagnostics.push({ type: "request", url });
    if (url.startsWith("http://localhost:3002/api")) {
      const rewritten = `${runtime.apiUrl}${url.slice("http://localhost:3002/api".length)}`;
      networkDiagnostics.push({ type: "rewrite", from: url, to: rewritten });
      request.continue({ url: rewritten });
    }
    else request.continue();
  });
  const results = [];
  const sourceUrl = `${runtime.portalUrl}/sentinelle/${source.buildingId}/exercise-actions/${source.actionItemId}`;
  try {
    for (const [width, height] of viewports) {
      for (const selected of themes) {
        await page.setViewport({ width, height, deviceScaleFactor: 1 });
        await page.evaluate(({ ui, preference }) => { localStorage.setItem("coro-ui-generation", ui); localStorage.setItem("coro-theme-preference", preference); }, selected);
        await page.goto(sourceUrl, { waitUntil: "networkidle2" });
        await page.waitForSelector('a[href*="/corrective-actions/"]', { timeout: 15000 });
        const sourceGeometry = await page.evaluate(measure);
        const actionHref = await page.$eval('a[href*="/corrective-actions/"]', (element) => element.href);
        await page.goto(actionHref, { waitUntil: "networkidle2" });
        await page.waitForSelector("#next-action-title", { timeout: 15000 });
        const detailGeometry = await page.evaluate(measure);
        await page.reload({ waitUntil: "networkidle2" });
        const sessionPersistent = await page.evaluate(() => Boolean(localStorage.getItem("coro_client_token")) && Boolean(document.querySelector("#next-action-title")));
        const id = `${width}x${height}-${selected.id}`;
        await page.screenshot({ path: join(evidenceDirectory, `${id}.png`), fullPage: true });
        const pass = sourceGeometry.viewport.width === width && sourceGeometry.viewport.height === height && sourceGeometry.ui === selected.expectedUi &&
          sourceGeometry.theme === selected.expectedTheme && sourceGeometry.linked && !sourceGeometry.globalOverflow && sourceGeometry.failures.length === 0 &&
          !detailGeometry.globalOverflow && detailGeometry.failures.length === 0 && sessionPersistent;
        results.push({ id, status: pass ? "PASS" : "FAIL", sourceGeometry, detailGeometry, sessionPersistent });
      }
    }
  } catch (error) {
    const diagnostic = {
      error: error instanceof Error ? error.message : String(error),
      url: page.url(),
      title: await page.title().catch(() => ""),
      body: await page.evaluate(() => document.body?.innerText.slice(0, 4000) || "").catch(() => ""),
      networkDiagnostics,
      browserErrors,
    };
    await page.screenshot({ path: join(evidenceDirectory, "browser-failure.png"), fullPage: true }).catch(() => undefined);
    await writeFile(join(evidenceDirectory, "browser-failure.json"), JSON.stringify(diagnostic, null, 2));
    throw error;
  } finally { await context.close(); if (isolated.ownedBrowser) await browser.close(); }
  const criticalErrors = [...new Set(browserErrors)].filter((message) => !/favicon|Failed to load resource.*404/i.test(message));
  const report = { status: results.every((item) => item.status === "PASS") && criticalErrors.length === 0 ? "PASS" : "FAIL",
    sourceActionItemId: source.actionItemId, correctiveActionId: source.correctiveActionId, results, criticalErrors };
  await writeFile(join(evidenceDirectory, "browser-matrix.json"), JSON.stringify(report, null, 2));
  return report;
}
