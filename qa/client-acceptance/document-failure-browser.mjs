#!/usr/bin/env node
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createRequire } from "node:module";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { resolveExerciseRexRuntime } from "../global-e2e/src/exercise-rex-runtime.mjs";
import { loadSecretStore } from "../global-e2e/src/secret-store.mjs";

const exec = promisify(execFile);
const require = createRequire(join(resolve("coro-backend"), "package.json"));
const puppeteer = require("puppeteer");
const api = "http://127.0.0.1:3166/api";
const frontend = "http://127.0.0.1:3167";
const projectId = "50000000-0000-4000-8000-000000000001";
const postgres = "coro-cp004-core-doc-postgres-1";
const runtime = resolveExerciseRexRuntime();
const secrets = await loadSecretStore();
const password = secrets.syntheticPassword;
const mfaDir = runtime.mfaDirectory;
const output = process.env.CORO_QA_BROWSER_EVIDENCE ?? runtime.evidenceDirectory;

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

async function latestCode(email, after) {
  const files = await Promise.all((await readdir(mfaDir)).map(async name => ({ name, time: (await stat(join(mfaDir, name))).mtimeMs })));
  for (const file of files.sort((a, b) => b.time - a.time)) {
    if (file.time < after - 2000) break;
    const message = JSON.parse(await readFile(join(mfaDir, file.name), "utf8"));
    if (String(message.to).toLowerCase() === email) return /\b(\d{6})\b/.exec(message.subject)?.[1];
  }
  throw new Error(`MFA missing for ${email}`);
}

async function login() {
  const email = "advisor-a@global-e2e.test";
  const after = Date.now();
  const challenge = await call("/auth/login", { method: "POST", body: { email, password } });
  if (![200, 201].includes(challenge.status)) throw new Error(`Challenge ${challenge.status}`);
  const verified = await call("/auth/verify-mfa", { method: "POST", body: { email, code: await latestCode(email, after) } });
  if (![200, 201].includes(verified.status) || !verified.data?.access_token) throw new Error(`MFA ${verified.status}`);
  return verified.data;
}

async function waitForBackend(token) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await call(`/projects/${projectId}`, { token });
      if (response.status === 200) return;
    } catch {}
    await new Promise(resolveWait => setTimeout(resolveWait, 1000));
  }
  throw new Error("Backend did not recover after PostgreSQL restart");
}

await mkdir(output, { recursive: true });
const auth = await login();
const restored = await call(`/projects/${projectId}`, { token: auth.access_token, method: "PUT", body: { status: "IN_PROGRESS" } });
if (restored.status !== 200) throw new Error(`Project preparation failed: ${restored.status}`);
const before = await call(`/generator/document/${projectId}`, { token: auth.access_token });
const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
let databaseStopped = false;
const evidence = { generatedAt: new Date().toISOString(), projectId, failure: {}, recovery: {} };
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(`${frontend}/login`, { waitUntil: "domcontentloaded" });
  await page.evaluate(({ token, user }) => {
    localStorage.setItem("coro_token", token);
    localStorage.setItem("coro_user", JSON.stringify(user));
    localStorage.setItem("coro-ui-generation", "glass");
    localStorage.setItem("coro-theme-preference", "LIGHT");
  }, { token: auth.access_token, user: auth.user });
  await page.goto(`${frontend}/projects/${projectId}`, { waitUntil: "networkidle2" });
  await page.waitForFunction(() => [...document.querySelectorAll("button")].some(button => /générer|régénérer/i.test(button.textContent ?? "")), { timeout: 20_000 });

  await exec("docker", ["stop", postgres]);
  databaseStopped = true;
  await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find(candidate => /générer|régénérer/i.test(candidate.textContent ?? ""));
    button?.click();
  });
  await page.waitForFunction(() => document.body.innerText.includes("Erreur lors de la génération du document."), { timeout: 30_000 });
  evidence.failure = {
    visibleMessage: true,
    message: "Erreur lors de la génération du document.",
    screenshot: "document-generation-failure.png",
  };
  await page.screenshot({ path: join(output, evidence.failure.screenshot), fullPage: true });

  await exec("docker", ["start", postgres]);
  databaseStopped = false;
  await waitForBackend(auth.access_token);
  const afterFailure = await call(`/generator/document/${projectId}`, { token: auth.access_token });
  evidence.failure.noPartialMutation = afterFailure.status === 200 && afterFailure.data?.id === before.data?.id && afterFailure.data?.version === before.data?.version;

  await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find(candidate => /générer|régénérer/i.test(candidate.textContent ?? ""));
    button?.click();
  });
  await page.waitForFunction(() => document.body.innerText.includes("Document généré avec succès"), { timeout: 60_000 });
  const afterRetry = await call(`/generator/document/${projectId}`, { token: auth.access_token });
  evidence.recovery = {
    visibleSuccess: true,
    sameDocument: afterRetry.data?.id === before.data?.id,
    versionBefore: before.data?.version,
    versionAfter: afterRetry.data?.version,
    exactlyOneVersion: afterRetry.data?.version === before.data?.version + 1,
    correctProject: afterRetry.data?.projectId === projectId,
    screenshot: "document-generation-recovered.png",
  };
  await page.screenshot({ path: join(output, evidence.recovery.screenshot), fullPage: true });
  evidence.pass = evidence.failure.visibleMessage && evidence.failure.noPartialMutation && Object.entries(evidence.recovery).filter(([key]) => ["visibleSuccess", "sameDocument", "exactlyOneVersion", "correctProject"].includes(key)).every(([, value]) => value === true);
} finally {
  if (databaseStopped) await exec("docker", ["start", postgres]).catch(() => undefined);
  await browser.close();
}
await writeFile(join(output, "document-failure-browser.json"), JSON.stringify(evidence, null, 2));
console.log(`DOCUMENT_FAILURE_BROWSER_${evidence.pass ? "PASS" : "FAIL"}`);
if (!evidence.pass) process.exitCode = 1;
