#!/usr/bin/env node
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { QaIdentityLab } from "../global-e2e/src/browser-orchestration.mjs";
import { loadSecretStore } from "../global-e2e/src/secret-store.mjs";
import { startMfaCaptureAdapter } from "../global-e2e/src/mfa-capture-adapter.mjs";
import { assertUnderQaRoot } from "../global-e2e/src/policy.mjs";

const root = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const require = createRequire(join(root, "coro-backend", "package.json"));
const puppeteer = require("puppeteer");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});
const apiUrl = process.env.CORO_QA_BACKEND_URL?.replace(/\/$/, "");
const frontendUrl = process.env.CORO_QA_FRONTEND_URL?.replace(/\/$/, "");
const providerUrl = process.env.CORO_QA_PROVIDER_URL?.replace(/\/$/, "");
const testedCommit = process.env.CORO_QA_COMMIT;
if (!apiUrl || !frontendUrl || !providerUrl || !testedCommit)
  throw new Error("QA runtime configuration incomplete");
const evidenceRoot = assertUnderQaRoot(
  process.env.CORO_QA_DOCUMENT_REVIEW_EVIDENCE,
);
const secrets = await loadSecretStore();
const adapter = await startMfaCaptureAdapter({
  captureDirectory: process.env.CORO_QA_MFA_DIR,
  channelToken: secrets.mfaChannelToken,
  port: Number(process.env.CORO_QA_MFA_ADAPTER_PORT || 34674),
});
const lab = new QaIdentityLab({
  apiUrl,
  frontendUrl,
  portalUrl: frontendUrl,
  password: secrets.syntheticPassword,
  mfaAdapterUrl: adapter.url,
  mfaChannelToken: secrets.mfaChannelToken,
});

const ids = {
  orgA: "10000000-0000-4000-8000-000000000002",
  orgB: "10000000-0000-4000-8000-000000000003",
  clientA: "30000000-0000-4000-8000-000000000001",
  buildingA: "40000000-0000-4000-8000-000000000001",
  advisor: "20000000-0000-4000-8000-000000000007",
  adminA: "20000000-0000-4000-8000-000000000005",
  adminB: "20000000-0000-4000-8000-000000000006",
  projectB: "50000000-0000-4000-8000-000000000003",
  pmu: "pr124-browser-pmu",
  psi: "pr124-browser-psi",
  pca: "pr124-browser-pca",
  stale: "pr124-browser-stale",
  outage: "pr124-browser-outage",
  lost: "pr124-browser-lost",
  matrix: "pr124-browser-matrix",
  archived: "pr124-browser-archived",
  inactive: "pr124-browser-inactive",
};
const report = {
  testedCommit,
  executedAt: new Date().toISOString(),
  checks: [],
  workflows: [],
  matrix: [],
  consoleErrors: [],
};
const record = (id, pass, observed) =>
  report.checks.push({ id, status: pass ? "PASS" : "FAIL", observed });
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
async function waitFor(check, label, attempts = 80) {
  for (let index = 0; index < attempts; index += 1) {
    const result = await check();
    if (result) return result;
    await sleep(125);
  }
  throw new Error(`Timeout: ${label}`);
}
async function customLogin(email, role, organizationId) {
  const startedAt = Date.now();
  const first = await lab.call("/auth/login", {
    method: "POST",
    body: { email, password: secrets.syntheticPassword },
  });
  if (first.status >= 300 || !first.data?.mfaRequired)
    throw new Error(`Login failed for ${email}: ${first.status}`);
  const code = await lab.completeMfa({ email, key: email }, startedAt);
  const verified = await lab.call("/auth/verify-mfa", {
    method: "POST",
    body: { email, code },
  });
  if (verified.status >= 300 || !verified.data?.access_token)
    throw new Error(`MFA failed for ${email}: ${verified.status}`);
  if (
    verified.data.user?.role !== role ||
    verified.data.user?.organizationId !== organizationId
  )
    throw new Error(`Identity scope mismatch for ${email}`);
  return {
    token: verified.data.access_token,
    refresh: verified.data.refresh_token,
    user: verified.data.user,
  };
}
async function browserSession(browser, session) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") report.consoleErrors.push(message.text());
  });
  await page.evaluateOnNewDocument(({ token, refresh, user }) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("coro_token", token);
    localStorage.setItem("coro_user", JSON.stringify(user));
    sessionStorage.setItem("coro_token", token);
    sessionStorage.setItem("coro_user", JSON.stringify(user));
    if (refresh) {
      localStorage.setItem("coro_refresh_token", refresh);
      sessionStorage.setItem("coro_refresh_token", refresh);
    }
  }, session);
  await page.goto(`${frontendUrl}/login`, { waitUntil: "domcontentloaded" });
  return { context, page };
}
async function clickText(page, matcher, selector = "button,a") {
  const handles = await page.$$(selector);
  for (const handle of handles) {
    const value = await handle.evaluate((element) => ({
      text: (element.textContent || "").replace(/\s+/g, " ").trim(),
      visible: Boolean(
        element.offsetWidth ||
        element.offsetHeight ||
        element.getClientRects().length,
      ),
      disabled: Boolean(element.disabled),
    }));
    if (value.visible && !value.disabled && matcher.test(value.text)) {
      await handle.click();
      return value.text;
    }
  }
  throw new Error(`Control not found: ${matcher}`);
}
async function clickLastText(page, matcher, selector = "button,a") {
  const handles = await page.$$(selector);
  for (const handle of handles.reverse()) {
    const value = await handle.evaluate((element) => ({
      text: (element.textContent || "").replace(/\s+/g, " ").trim(),
      visible: Boolean(
        element.offsetWidth || element.offsetHeight || element.getClientRects().length,
      ),
      disabled: Boolean(element.disabled),
    }));
    if (value.visible && !value.disabled && matcher.test(value.text)) {
      await handle.click();
      return value.text;
    }
  }
  throw new Error(`Control not found: ${matcher}`);
}
async function visibleText(page, matcher, selector = "button,a") {
  return page.$$eval(
    selector,
    (nodes, source, flags) =>
      nodes.some((node) => {
        const visible = Boolean(
          node.offsetWidth || node.offsetHeight || node.getClientRects().length,
        );
        return (
          visible &&
          new RegExp(source, flags).test(
            (node.textContent || "").replace(/\s+/g, " ").trim(),
          )
        );
      }),
    matcher.source,
    matcher.flags,
  );
}
async function generateInBrowser(page, projectId) {
  await page.goto(`${frontendUrl}/projects/${projectId}`, {
    waitUntil: "networkidle0",
  });
  await page
    .waitForFunction(
      () =>
        Array.from(document.querySelectorAll("button,a")).some((node) =>
          /G.n.rer/.test((node.textContent || "").replace(/\s+/g, " ").trim()),
        ),
      { timeout: 10_000 },
    )
    .catch(() => undefined);
  const generationControl = await visibleText(page, /G.n.rer/);
  if (!generationControl) {
    const diagnostic = await page.evaluate(() => ({
      url: location.href,
      body: document.body.innerText.slice(0, 1500),
      controls: Array.from(document.querySelectorAll("button,a")).map((node) =>
        (node.textContent || "").replace(/\s+/g, " ").trim(),
      ),
    }));
    throw new Error(
      `Generation control unavailable for ${projectId}: ${JSON.stringify(diagnostic)}`,
    );
  }
  const [response] = await Promise.all([
    page.waitForResponse(
      (candidate) =>
        candidate.request().method() === "POST" &&
        candidate.url().includes(`/generator/generate/${projectId}`),
      { timeout: 15_000 },
    ),
    clickText(page, /G.n.rer/),
  ]);
  if (!response.ok()) {
    const body = await response.text().catch(() => "<unreadable response>");
    throw new Error(
      `Generation request failed for ${projectId}: HTTP ${response.status()} ${body}`,
    );
  }
  return waitFor(
    () => prisma.document.findFirst({ where: { projectId } }),
    `generation ${projectId}`,
  );
}
async function editInBrowser(page, projectId, marker) {
  await page.goto(`${frontendUrl}/editor/${projectId}`, {
    waitUntil: "networkidle0",
  });
  await clickText(page, /Modifier/);
  await page.waitForSelector("textarea");
  await page.$eval(
    "textarea",
    (element, value) => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )?.set;
      setter?.call(element, value);
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    },
    marker,
  );
  await clickText(page, /Sauvegarder(?: les modifications)?/);
  return waitFor(async () => {
    const doc = await prisma.document.findFirst({ where: { projectId } });
    return JSON.stringify(doc?.content).includes(marker) ? doc : null;
  }, `save ${projectId}`);
}
async function submitInBrowser(page, projectId) {
  await page.goto(`${frontendUrl}/projects/${projectId}`, {
    waitUntil: "networkidle0",
  });
  await clickText(page, /Soumettre/);
  return waitFor(
    () =>
      prisma.project.findFirst({ where: { id: projectId, status: "REVIEW" } }),
    `submit ${projectId}`,
  );
}
async function approveInBrowser(page, projectId) {
  await page.goto(`${frontendUrl}/projects/${projectId}`, {
    waitUntil: "networkidle0",
  });
  await clickText(page, /^✓?\s*Approuver$/);
  await page.waitForSelector("textarea");
  await clickText(page, /^✓?\s*Approuver$/);
  return waitFor(
    () =>
      prisma.project.findFirst({
        where: { id: projectId, status: "VALIDATED" },
      }),
    `approve ${projectId}`,
  );
}
async function approveInBrowserThroughModal(page, projectId) {
  await page.goto(`${frontendUrl}/projects/${projectId}`, {
    waitUntil: "networkidle0",
  });
  await clickText(page, /Approuver$/);
  await page.waitForSelector(".fixed.inset-0 textarea");
  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().includes(`/approval/${projectId}/approve`),
    { timeout: 15_000 },
  );
  await page.$eval(".fixed.inset-0", (modal) => {
    const buttons = Array.from(modal.querySelectorAll("button"));
    const confirm = buttons.find((button) =>
      /Approuver/.test((button.textContent || "").trim()),
    );
    if (!confirm) throw new Error("Approval confirmation unavailable");
    confirm.click();
  });
  const response = await responsePromise;
  if (!response.ok()) {
    const body = await response.text().catch(() => "<unreadable response>");
    throw new Error(`Approval failed for ${projectId}: HTTP ${response.status()} ${body}`);
  }
  return waitFor(
    () =>
      prisma.project.findFirst({
        where: { id: projectId, status: "VALIDATED" },
      }),
    `approve ${projectId}`,
  );
}
async function seedProject(id, name, type, extra = {}) {
  await prisma.project.upsert({
    where: { id },
    update: {
      name,
      documentType: type,
      status: extra.status || "DRAFT",
      isActive: extra.isActive ?? true,
      userId: ids.advisor,
      progress: 25,
      configData: { province: "QC", syntheticQa: true },
    },
    create: {
      id,
      name,
      documentType: type,
      year: 2026,
      organizationId: ids.orgA,
      clientId: ids.clientA,
      buildingId: ids.buildingA,
      userId: ids.advisor,
      status: extra.status || "DRAFT",
      isActive: extra.isActive ?? true,
      progress: 25,
      configData: { province: "QC", syntheticQa: true },
    },
  });
  if (type === "PCA")
    await prisma.pcaConfig.upsert({
      where: { projectId: id },
      update: { planName: name },
      create: {
        projectId: id,
        planName: name,
        regulatoryReqs: [],
        authoritiesToNotify: [],
      },
    });
}

let browser;
try {
  await mkdir(evidenceRoot, { recursive: true });
  const projectIds = Object.values(ids).filter((value) =>
    String(value).startsWith("pr124-browser-"),
  );
  await prisma.documentReviewNotificationEvent.deleteMany({
    where: { projectId: { in: projectIds } },
  });
  await prisma.documentReviewRequest.deleteMany({
    where: { projectId: { in: projectIds } },
  });
  await prisma.documentGenerationRequest.deleteMany({
    where: { projectId: { in: projectIds } },
  });
  await prisma.projectVersion.deleteMany({
    where: { projectId: { in: projectIds } },
  });
  await prisma.auditLog.deleteMany({
    where: { projectId: { in: projectIds } },
  });
  await prisma.notification.deleteMany({
    where: { projectId: { in: projectIds } },
  });
  await prisma.document.deleteMany({
    where: { projectId: { in: projectIds } },
  });
  await prisma.pcaConfig.deleteMany({
    where: { projectId: { in: projectIds } },
  });
  await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
  for (const [id, name, type, extra] of [
    [ids.pmu, "PR124 Integrated PMU", "PMU", {}],
    [ids.psi, "PR124 Integrated PSI", "PSI", {}],
    [ids.pca, "PR124 Integrated PCA", "PCA", {}],
    [ids.stale, "PR124 Stale Review", "PMU", {}],
    [ids.outage, "PR124 Outage Review", "PMU", {}],
    [ids.lost, "PR124 Lost Response", "PMU", {}],
    [ids.matrix, "PR124 Browser Matrix", "PMU", {}],
    [ids.archived, "PR124 Archived", "PMU", { status: "ARCHIVED" }],
    [ids.inactive, "PR124 Inactive", "PMU", { isActive: false }],
  ])
    await seedProject(id, name, type, extra);

  const advisor = await lab.loginAs("advisor");
  const adminA = await customLogin(
    "customer-admin-a@global-e2e.test",
    "ADMIN",
    ids.orgA,
  );
  browser = await puppeteer.launch({
    headless: true,
    executablePath:
      process.env.CORO_QA_CHROME_EXECUTABLE ||
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--force-device-scale-factor=1"],
  });
  const authorBrowser = await browserSession(browser, advisor);
  const reviewerBrowser = await browserSession(browser, adminA);

  for (const [type, projectId] of [
    ["PMU", ids.pmu],
    ["PSI", ids.psi],
    ["PCA", ids.pca],
  ]) {
    const document = await generateInBrowser(authorBrowser.page, projectId);
    const marker = `PR124 ${type} contenu soumis ${testedCommit.slice(0, 12)}`;
    await editInBrowser(authorBrowser.page, projectId, marker);
    await submitInBrowser(authorBrowser.page, projectId);
    const selfApproval = await lab.call(`/approval/${projectId}/approve`, {
      method: "POST",
      token: advisor.token,
      body: {},
    });
    const authorSeesApproval = await visibleText(
      authorBrowser.page,
      /^✓?\s*Approuver$/,
    );
    await reviewerBrowser.page.goto(`${frontendUrl}/projects/${projectId}`, {
      waitUntil: "networkidle0",
    });
    await clickText(reviewerBrowser.page, /Observations/);
    const reviewText = await reviewerBrowser.page.evaluate(
      () => document.body.innerText,
    );
    const request = await prisma.documentReviewRequest.findFirstOrThrow({
      where: { projectId, status: "PENDING" },
    });
    const versionIdentified =
      reviewText.includes(`v${request.documentVersion}`) &&
      reviewText.includes(request.contentHash.slice(0, 12));
    await approveInBrowserThroughModal(reviewerBrowser.page, projectId);
    await reviewerBrowser.page.reload({ waitUntil: "networkidle0" });
    await reviewerBrowser.page.goto(`${frontendUrl}/editor/${projectId}`, {
      waitUntil: "networkidle0",
    });
    const reopenedText = await reviewerBrowser.page.evaluate(
      () => document.body.innerText,
    );
    const readOnly = !(await visibleText(reviewerBrowser.page, /Modifier/));
    const versions = await prisma.projectVersion.count({
      where: { projectId },
    });
    report.workflows.push({
      type,
      projectId,
      documentId: document.id,
      generation: "PASS",
      edition: "PASS",
      submission: "PASS",
      independentReview: "PASS",
      decision: "PASS",
      reopenReadOnly:
        readOnly && reopenedText.includes(marker) ? "PASS" : "FAIL",
      versionIdentified,
      selfApprovalDenied: selfApproval.status === 403 && !authorSeesApproval,
      versions,
    });
  }
  record(
    "integrated-pmu-psi-pca",
    report.workflows.every(
      (item) =>
        Object.values(item).every((value) => value !== "FAIL") &&
        item.versionIdentified &&
        item.selfApprovalDenied &&
        item.versions === 1,
    ),
    report.workflows,
  );

  for (const [state, projectId] of [
    ["archived", ids.archived],
    ["inactive", ids.inactive],
  ]) {
    const denied = await lab.call(`/approval/${projectId}/submit`, {
      method: "POST",
      token: advisor.token,
      body: {},
    });
    const effects = await prisma.documentReviewRequest.count({
      where: { projectId },
    });
    record(`${state}-submit-denial`, denied.status >= 400 && effects === 0, {
      http: denied.status,
      effects,
    });
  }
  const crossTenant = await lab.call(`/approval/${ids.projectB}/can-approve`, {
    token: adminA.token,
  });
  record(
    "cross-tenant-review-denial",
    crossTenant.status === 200 && crossTenant.data?.canApprove === false,
    { http: crossTenant.status, body: crossTenant.data },
  );

  await generateInBrowser(authorBrowser.page, ids.stale);
  await editInBrowser(authorBrowser.page, ids.stale, "PR124 stale original");
  await submitInBrowser(authorBrowser.page, ids.stale);
  await prisma.document.updateMany({
    where: { projectId: ids.stale },
    data: {
      content: { qa: "changed after submission" },
      lockVersion: { increment: 1 },
    },
  });
  const staleDecision = await lab.call(`/approval/${ids.stale}/approve`, {
    method: "POST",
    token: adminA.token,
    body: {},
  });
  record(
    "stale-review-denial",
    staleDecision.status === 409 &&
      (await prisma.projectVersion.count({
        where: { projectId: ids.stale },
      })) === 0,
    { http: staleDecision.status },
  );

  await generateInBrowser(authorBrowser.page, ids.outage);
  await editInBrowser(authorBrowser.page, ids.outage, "PR124 outage recovery");
  await submitInBrowser(authorBrowser.page, ids.outage);
  await reviewerBrowser.page.setRequestInterception(true);
  const intercept = (request) =>
    request.url().includes(`/approval/${ids.outage}/approve`) &&
    request.method() === "POST"
      ? request.respond({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ message: "QA injected outage" }),
        })
      : request.continue();
  reviewerBrowser.page.on("request", intercept);
  await reviewerBrowser.page.goto(`${frontendUrl}/projects/${ids.outage}`, {
    waitUntil: "networkidle0",
  });
  await clickText(reviewerBrowser.page, /^✓?\s*Approuver$/);
  await clickText(reviewerBrowser.page, /^✓?\s*Approuver$/);
  await sleep(500);
  const unchangedAfter503 =
    (await prisma.project.findUniqueOrThrow({ where: { id: ids.outage } }))
      .status === "REVIEW";
  reviewerBrowser.page.off("request", intercept);
  await reviewerBrowser.page.setRequestInterception(false);
  await approveInBrowserThroughModal(reviewerBrowser.page, ids.outage);
  record("browser-503-fail-closed-and-retry", unchangedAfter503, {
    unchangedAfter503,
    final: "VALIDATED",
  });

  await generateInBrowser(authorBrowser.page, ids.lost);
  await editInBrowser(authorBrowser.page, ids.lost, "PR124 response lost");
  await submitInBrowser(authorBrowser.page, ids.lost);
  const beforeProvider = await (
    await fetch(`${providerUrl}/__qa/state`)
  ).json();
  await fetch(`${providerUrl}/__qa/fail-next`, { method: "POST", body: "{}" });
  const firstDecision = await lab.call(`/approval/${ids.lost}/approve`, {
    method: "POST",
    token: adminA.token,
    body: {},
  });
  const failedEvent = await waitFor(
    () =>
      prisma.documentReviewNotificationEvent.findFirst({
        where: { projectId: ids.lost, eventType: "APPROVED", status: "FAILED" },
      }),
    "failed provider event",
  );
  const recoveredEvent = await waitFor(
    () =>
      prisma.documentReviewNotificationEvent.findFirst({
        where: { id: failedEvent.id, status: "DELIVERED" },
      }),
    "outbox retry",
    320,
  );
  const replayDecision = await lab.call(`/approval/${ids.lost}/approve`, {
    method: "POST",
    token: adminA.token,
    body: {},
  });
  const afterProvider = await (await fetch(`${providerUrl}/__qa/state`)).json();
  const eventCount = await prisma.documentReviewNotificationEvent.count({
    where: { projectId: ids.lost, eventType: "APPROVED" },
  });
  record(
    "outbox-provider-failure-retry-dedupe",
    firstDecision.status < 300 &&
      replayDecision.data?.replayed === true &&
      recoveredEvent.attempts === 2 &&
      eventCount === 1 &&
      afterProvider.failed === beforeProvider.failed + 1 &&
      afterProvider.accepted > beforeProvider.accepted,
    {
      firstHttp: firstDecision.status,
      replayed: replayDecision.data?.replayed,
      attempts: recoveredEvent.attempts,
      eventCount,
      deliveryContract: "at-least-once provider delivery; one durable event per decision",
      beforeProvider,
      afterProvider,
    },
  );

  await generateInBrowser(authorBrowser.page, ids.matrix);
  await editInBrowser(authorBrowser.page, ids.matrix, "PR124 matrix content");
  await submitInBrowser(authorBrowser.page, ids.matrix);
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
  for (const viewport of viewports)
    for (const theme of themes) {
      await reviewerBrowser.page.setViewport(viewport);
      await reviewerBrowser.page.goto(frontendUrl, {
        waitUntil: "domcontentloaded",
      });
      await reviewerBrowser.page.evaluate(({ ui, preference }) => {
        localStorage.setItem("coro-ui-generation", ui);
        localStorage.setItem("coro-theme-preference", preference);
      }, theme);
      await reviewerBrowser.page.goto(`${frontendUrl}/projects/${ids.matrix}`, {
        waitUntil: "networkidle0",
      });
      const geometry = await reviewerBrowser.page.evaluate(() => {
        const controls = [...document.querySelectorAll("button,a")].filter(
          (node) =>
            node.offsetWidth ||
            node.offsetHeight ||
            node.getClientRects().length,
        );
        return {
          overflow:
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth + 1,
          clipped: controls
            .filter((node) => {
              const r = node.getBoundingClientRect();
              return (
                !node.closest("nav,aside") &&
                (r.left < -1 || r.right > innerWidth + 1)
              );
            })
            .map((node) => (node.textContent || "").trim().slice(0, 50)),
          approveVisible: controls.some((node) =>
            /Approuver/.test(node.textContent || ""),
          ),
          observationsVisible: controls.some((node) =>
            /Observations/.test(node.textContent || ""),
          ),
        };
      });
      const status =
        !geometry.overflow &&
        geometry.clipped.length === 0 &&
        geometry.approveVisible &&
        geometry.observationsVisible
          ? "PASS"
          : "FAIL";
      report.matrix.push({ viewport, theme: theme.name, status, geometry });
      await reviewerBrowser.page.screenshot({
        path: join(
          evidenceRoot,
          `${viewport.width}x${viewport.height}-${theme.name}.png`,
        ),
        fullPage: true,
      });
    }
  record(
    "chrome-matrix-12-of-12",
    report.matrix.every((entry) => entry.status === "PASS"),
    `${report.matrix.filter((entry) => entry.status === "PASS").length}/12`,
  );
  await reviewerBrowser.page.setViewport({ width: 1440, height: 900 });
  await reviewerBrowser.page.goto(`${frontendUrl}/projects/${ids.matrix}`, {
    waitUntil: "networkidle0",
  });
  await reviewerBrowser.page.keyboard.press("Tab");
  const focused = await reviewerBrowser.page.evaluate(() => ({
    tag: document.activeElement?.tagName,
    text: document.activeElement?.textContent?.trim().slice(0, 60),
  }));
  const cdp = await reviewerBrowser.page.createCDPSession();
  await cdp.send("Emulation.setPageScaleFactor", { pageScaleFactor: 2 });
  const zoom = await reviewerBrowser.page.evaluate(() => ({
    overflow:
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth + 1,
    width: document.documentElement.clientWidth,
  }));
  await cdp.send("Emulation.setPageScaleFactor", { pageScaleFactor: 1 });
  await reviewerBrowser.page.reload({ waitUntil: "networkidle0" });
  const persisted = (
    await reviewerBrowser.page.evaluate(() => document.body.innerText)
  ).includes("PR124 Browser Matrix");
  record(
    "keyboard-focus-zoom-f5",
    focused.tag !== "BODY" && !zoom.overflow && persisted,
    { focused, zoom, persisted },
  );
  record(
    "critical-console-errors",
    report.consoleErrors.filter((value) => !/favicon|404/.test(value))
      .length === 0,
    report.consoleErrors,
  );
} catch (error) {
  report.fatalError = error instanceof Error ? error.stack : String(error);
  record("campaign-completion", false, report.fatalError);
} finally {
  if (browser) await browser.close().catch(() => undefined);
  await adapter.close();
  report.pass = report.checks.every((entry) => entry.status === "PASS");
  await mkdir(evidenceRoot, { recursive: true });
  await writeFile(
    join(evidenceRoot, "document-review-browser-acceptance.json"),
    JSON.stringify(report, null, 2),
  );
  await prisma.$disconnect();
}
console.log(
  JSON.stringify(
    {
      pass: report.pass,
      checks: report.checks,
      workflows: report.workflows,
      matrix: report.matrix.length,
    },
    null,
    2,
  ),
);
if (!report.pass) process.exitCode = 1;
