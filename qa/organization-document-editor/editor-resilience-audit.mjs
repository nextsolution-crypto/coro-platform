#!/usr/bin/env node
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

const apiOrigin = (process.env.CORO_QA_BACKEND_URL || "http://127.0.0.1:3170/api").replace(/\/$/, "");
const appOrigin = (process.env.CORO_QA_FRONTEND_URL || "http://127.0.0.1:3171").replace(/\/$/, "");
const password = process.env.CORO_QA_SYNTHETIC_PASSWORD;
const mfaDirectory = process.env.CORO_QA_MFA_DIR;
const evidenceDirectory = process.env.CORO_QA_EVIDENCE;
const databaseUrl = process.env.DATABASE_URL;
const testedCommit = process.env.CORO_QA_TESTED_COMMIT;
if (!password || !mfaDirectory || !evidenceDirectory || !databaseUrl || !testedCommit)
  throw new Error("QA configuration incomplete");
const databaseTarget = new URL(databaseUrl);
if (
  databaseTarget.hostname !== "127.0.0.1" ||
  !/^\d+$/.test(databaseTarget.port) ||
  databaseTarget.pathname !== "/coro_qa_global_e2e"
)
  throw new Error("Refusing non-disposable database");

await mkdir(evidenceDirectory, { recursive: true });
const backendRequire = createRequire(resolve("coro-backend/package.json"));
const { PrismaClient } = backendRequire("@prisma/client");
const puppeteer = backendRequire("puppeteer");
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const projectId = "50000000-0000-4000-8000-000000000001";
const checks = [];
const record = (id, pass, observed) => checks.push({ id, status: pass ? "PASS" : "FAIL", observed });

async function call(route, { token, method = "GET", body, headers = {} } = {}) {
  const response = await fetch(`${apiOrigin}${route}`, {
    method,
    headers: { ...(body === undefined ? {} : { "content-type": "application/json" }), ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
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
  throw new Error(`MFA capture missing for ${email}`);
}

async function login(email) {
  const after = Date.now();
  const challenge = await call("/auth/login", { method: "POST", body: { email, password } });
  const verified = await call("/auth/verify-mfa", { method: "POST", body: { email, code: await latestCode(email, after) } });
  const token = verified.data?.access_token ?? verified.data?.token;
  if (![200, 201].includes(challenge.status) || !token) throw new Error("Synthetic authentication failed");
  return { token, user: verified.data.user };
}

async function openEditor(browser, actor) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(appOrigin, { waitUntil: "domcontentloaded" });
  await page.evaluate(({ token, user }) => {
    localStorage.setItem("coro_token", token);
    localStorage.setItem("coro_user", JSON.stringify(user));
    sessionStorage.setItem("coro_token", token);
    sessionStorage.setItem("coro_user", JSON.stringify(user));
  }, actor);
  await page.goto(`${appOrigin}/editor/${projectId}`, { waitUntil: "networkidle2", timeout: 30000 });
  await page.waitForFunction(() => [...document.querySelectorAll("button")].some((item) => item.textContent?.includes("Modifier")));
  return page;
}

async function clickText(page, text) {
  await page.evaluate((label) => {
    const button = [...document.querySelectorAll("button")].find((item) => item.textContent?.includes(label));
    if (!button) throw new Error(`Button missing: ${label}`);
    button.click();
  }, text);
}

async function editAndSave(page, content) {
  await clickText(page, "Modifier");
  await page.waitForSelector("textarea");
  await page.$eval("textarea", (node, value) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
    setter.call(node, value);
    node.dispatchEvent(new Event("input", { bubbles: true }));
  }, content);
  await clickText(page, "Sauvegarder les modifications");
}

const actor = await login("advisor-a@global-e2e.test");
await prisma.project.update({ where: { id: projectId }, data: { status: "IN_PROGRESS" } });
let doc = await call(`/generator/document/${projectId}`, { token: actor.token });
if (doc.status === 404 || !doc.data?.id) {
  await call(`/generator/generate/${projectId}`, { token: actor.token, method: "POST", body: {}, headers: { "idempotency-key": `editor-resilience-${projectId}`, "x-expected-document-version": "0" } });
  doc = await call(`/generator/document/${projectId}`, { token: actor.token });
}
const documentId = doc.data.id;
const module = doc.data.content.modules_fr.find((item) => item.sections?.length);
const section = module.sections[0];
const originalContent = section.content;

const browser = await puppeteer.launch({ headless: true, executablePath: process.env.CORO_QA_CHROME || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", args: ["--no-sandbox"] });
try {
  const beforeWritePage = await openEditor(browser, actor);
  await beforeWritePage.setRequestInterception(true);
  let injected503 = false;
  beforeWritePage.on("request", (request) => {
    if (!injected503 && request.method() === "PUT" && request.url().includes("/generator/document/")) {
      injected503 = true;
      request.respond({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Synthetic pre-write failure" }) });
    } else request.continue();
  });
  const beforeContent = `QA-503-${Date.now()}`;
  await editAndSave(beforeWritePage, beforeContent);
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 1500));
  const after503 = await call(`/generator/document/${projectId}`, { token: actor.token });
  const persistedAfter503 = after503.data.content.modules_fr.find((item) => item.moduleNumber === module.moduleNumber).sections.find((item) => item.id === section.id).content;
  const uiAfter503 = await beforeWritePage.evaluate(() => ({
    draft: document.querySelector("textarea")?.value,
    saved: document.body.innerText.includes("Sauvegardé"),
    errorVisible: Boolean(document.querySelector('[role="alert"]')),
  }));
  record("pre-write-503-fails-closed", persistedAfter503 !== beforeContent && uiAfter503.draft === beforeContent && !uiAfter503.saved && uiAfter503.errorVisible, { persistedUnchanged: persistedAfter503 !== beforeContent, draftRetained: uiAfter503.draft === beforeContent, falseSuccess: uiAfter503.saved, errorVisible: uiAfter503.errorVisible });
  await clickText(beforeWritePage, "Sauvegarder les modifications");
  await beforeWritePage.waitForFunction(() => document.body.innerText.includes("Sauvegardé"));
  const afterRetry = await call(`/generator/document/${projectId}`, { token: actor.token });
  const persistedAfterRetry = afterRetry.data.content.modules_fr.find((item) => item.moduleNumber === module.moduleNumber).sections.find((item) => item.id === section.id).content;
  record("pre-write-retry-succeeds-once", persistedAfterRetry === beforeContent, { persisted: persistedAfterRetry === beforeContent });
  await beforeWritePage.close();

  const lostPage = await openEditor(browser, actor);
  const cdp = await lostPage.target().createCDPSession();
  await cdp.send("Fetch.enable", { patterns: [{ urlPattern: "*/generator/document/*/module/*", requestStage: "Response" }] });
  let responseDropped = false;
  cdp.on("Fetch.requestPaused", async (event) => {
    if (!responseDropped && event.request.method === "PUT") {
      responseDropped = true;
      await cdp.send("Fetch.failRequest", { requestId: event.requestId, errorReason: "Aborted" });
    } else await cdp.send("Fetch.continueRequest", { requestId: event.requestId });
  });
  const lostContent = `QA-LOST-${Date.now()}`;
  await editAndSave(lostPage, lostContent);
  await lostPage.waitForFunction(() => document.body.innerText.includes("Sauvegardé"), { timeout: 15000 });
  const afterLost = await call(`/generator/document/${projectId}`, { token: actor.token });
  const persistedAfterLost = afterLost.data.content.modules_fr.find((item) => item.moduleNumber === module.moduleNumber).sections.find((item) => item.id === section.id).content;
  record("response-lost-after-write-reconciled", responseDropped && persistedAfterLost === lostContent, { responseDropped, persisted: persistedAfterLost === lostContent });
  await lostPage.close();

  const navigationPage = await openEditor(browser, actor);
  const draft = `QA-DRAFT-${Date.now()}`;
  await clickText(navigationPage, "Modifier");
  await navigationPage.waitForSelector("textarea");
  await navigationPage.$eval("textarea", (node, value) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
    setter.call(node, value);
    node.dispatchEvent(new Event("input", { bubbles: true }));
  }, draft);
  navigationPage.once("dialog", (dialog) => dialog.dismiss());
  await navigationPage.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
  const f5DraftRetained = await navigationPage.$eval("textarea", (node) => node.value).catch(() => "");
  record("unsaved-f5-warning-retains-draft-on-cancel", f5DraftRetained === draft, { draftRetained: f5DraftRetained === draft });
  navigationPage.once("dialog", (dialog) => dialog.dismiss());
  await navigationPage.goBack({ waitUntil: "domcontentloaded", timeout: 5000 }).catch(() => {});
  const backDraftRetained = await navigationPage.$eval("textarea", (node) => node.value).catch(() => "");
  record("unsaved-browser-back-warning-retains-draft-on-cancel", navigationPage.url().includes(`/editor/${projectId}`) && backDraftRetained === draft, { remainedInEditor: navigationPage.url().includes(`/editor/${projectId}`), draftRetained: backDraftRetained === draft });
  await navigationPage.keyboard.press("Tab");
  const focusVisible = await navigationPage.evaluate(() => Boolean(document.activeElement && document.activeElement !== document.body));
  await cdp.detach().catch(() => {});
  await navigationPage._client().send("Emulation.setPageScaleFactor", { pageScaleFactor: 2 }).catch(() => {});
  const zoomGeometry = await navigationPage.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  record("keyboard-focus-and-200-percent-zoom", focusVisible && zoomGeometry.scrollWidth <= zoomGeometry.clientWidth, { focusVisible, zoomGeometry });
  await navigationPage.screenshot({ path: join(evidenceDirectory, "editor-resilience-zoom-200.png"), fullPage: true });
  await navigationPage.close();

  const restore = await call(`/generator/document/${projectId}`, { token: actor.token });
  await call(`/generator/document/${documentId}/module/${module.moduleNumber}/section/${section.id}`, { token: actor.token, method: "PUT", body: { content: originalContent, language: "fr", expectedLockVersion: restore.data.lockVersion } });
} finally {
  await browser.close();
  await prisma.$disconnect();
}

const result = { generatedAt: new Date().toISOString(), testedCommit, environment: { apiOrigin, appOrigin, database: "PostgreSQL 16 disposable", network: "deny-by-default" }, checks, summary: { passed: checks.filter((item) => item.status === "PASS").length, failed: checks.filter((item) => item.status === "FAIL").length } };
await writeFile(join(evidenceDirectory, "editor-resilience-audit.json"), JSON.stringify(result, null, 2));
console.log(`EDITOR_RESILIENCE_COMPLETE ${JSON.stringify(result.summary)}`);
if (result.summary.failed) process.exitCode = 1;
