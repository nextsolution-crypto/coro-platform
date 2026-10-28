#!/usr/bin/env node
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

const apiOrigin = (
  process.env.CORO_QA_BACKEND_URL || "http://127.0.0.1:3170/api"
).replace(/\/$/, "");
const appOrigin = (
  process.env.CORO_QA_FRONTEND_URL || "http://127.0.0.1:3171"
).replace(/\/$/, "");
const password = process.env.CORO_QA_SYNTHETIC_PASSWORD;
const mfaDirectory = process.env.CORO_QA_MFA_DIR;
const evidenceDirectory = process.env.CORO_QA_EVIDENCE;
const databaseUrl = process.env.DATABASE_URL;
const testedCommit = process.env.CORO_QA_TESTED_COMMIT;
if (
  !password ||
  !mfaDirectory ||
  !evidenceDirectory ||
  !databaseUrl ||
  !testedCommit
) {
  throw new Error("QA configuration incomplete");
}
if (!/127\.0\.0\.1:55474\/coro_qa_global_e2e$/.test(databaseUrl)) {
  throw new Error("Refusing non-disposable database");
}

await mkdir(evidenceDirectory, { recursive: true });
const backendRequire = createRequire(resolve("coro-backend/package.json"));
const { PrismaClient } = backendRequire("@prisma/client");
const puppeteer = backendRequire("puppeteer");
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

const ids = {
  project: "50000000-0000-4000-8000-000000000001",
  archivedProject: "50000000-0000-4000-8000-000000000002",
  psiProject: "50000000-0000-4000-8000-000000000021",
  pcaProject: "50000000-0000-4000-8000-000000000022",
};
const report = {
  generatedAt: new Date().toISOString(),
  testedCommit,
  environment: {
    apiOrigin,
    appOrigin,
    database: "PostgreSQL 16 disposable",
    network: "deny-by-default",
  },
  checks: [],
  browser: [],
};

function record(id, expected, observed, status = expected ? "PASS" : "FAIL") {
  report.checks.push({ id, status, observed });
}
async function call(route, { token, method = "GET", body } = {}) {
  const response = await fetch(`${apiOrigin}${route}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data = text;
  try {
    data = JSON.parse(text);
  } catch {}
  return {
    status: response.status,
    data,
    headers: Object.fromEntries(response.headers),
  };
}
async function latestCode(email, after) {
  const entries = await Promise.all(
    (await readdir(mfaDirectory)).map(async (name) => ({
      name,
      time: (await stat(join(mfaDirectory, name))).mtimeMs,
    })),
  );
  for (const entry of entries.sort((a, b) => b.time - a.time)) {
    if (entry.time < after - 2000) break;
    const message = JSON.parse(
      await readFile(join(mfaDirectory, entry.name), "utf8"),
    );
    if (String(message.to).toLowerCase() === email)
      return /\b(\d{6})\b/.exec(message.subject)?.[1];
  }
  throw new Error(`MFA capture missing for ${email}`);
}
async function login(email) {
  const after = Date.now();
  const challenge = await call("/auth/login", {
    method: "POST",
    body: { email, password },
  });
  if (![200, 201].includes(challenge.status) || !challenge.data?.mfaRequired)
    throw new Error(`Login challenge failed: ${challenge.status}`);
  const verified = await call("/auth/verify-mfa", {
    method: "POST",
    body: { email, code: await latestCode(email, after) },
  });
  const token = verified.data?.access_token ?? verified.data?.token;
  if (![200, 201].includes(verified.status) || !token)
    throw new Error(`MFA failed: ${verified.status}`);
  return { token, user: verified.data.user };
}

try {
  const advisor = await login("advisor-a@global-e2e.test");
  let initial = await call(`/generator/document/${ids.project}`, {
    token: advisor.token,
  });
  if (initial.status === 404 || (initial.status === 200 && !initial.data?.id)) {
    const generated = await call(`/generator/generate/${ids.project}`, {
      token: advisor.token,
      method: "POST",
      body: {},
    });
    if (![200, 201].includes(generated.status))
      throw new Error(
        `Canonical document generation failed: ${generated.status}`,
      );
    initial = await call(`/generator/document/${ids.project}`, {
      token: advisor.token,
    });
  }
  const documentId = initial.data?.id;
  const module = initial.data?.content?.modules_fr?.find(
    (item) => item.sections?.length,
  );
  const section = module?.sections?.[0];
  if (!documentId || !module || !section)
    throw new Error(
      `Canonical synthetic document missing: status=${initial.status} id=${Boolean(documentId)} modules=${initial.data?.content?.modules_fr?.length ?? "none"}`,
    );
  const originalContent = String(section.content ?? "");
  let lockVersion = initial.data.lockVersion;

  await prisma.user.update({
    where: { id: advisor.user.id },
    data: { isActive: false },
  });
  const revokedSessionRead = await call(`/generator/document/${ids.project}`, {
    token: advisor.token,
  });
  await prisma.user.update({
    where: { id: advisor.user.id },
    data: { isActive: true },
  });
  record(
    "revoked-session-denial",
    [401, 403].includes(revokedSessionRead.status),
    { httpStatus: revokedSessionRead.status },
  );

  const adminB = await login("customer-admin-b@global-e2e.test");
  const crossTenantRead = await call(`/generator/document/${ids.project}`, {
    token: adminB.token,
  });
  const crossTenantMutation = await call(
    `/generator/document/${documentId}/module/${module.moduleNumber}/section/${section.id}`,
    {
      token: adminB.token,
      method: "PUT",
      body: {
        content: "Forbidden cross-tenant mutation",
        language: "fr",
        expectedLockVersion: lockVersion,
      },
    },
  );
  record(
    "cross-tenant-read-and-write-denial",
    crossTenantRead.status === 404 && crossTenantMutation.status === 404,
    {
      readStatus: crossTenantRead.status,
      writeStatus: crossTenantMutation.status,
    },
  );
  const sourceProject = await prisma.project.findUniqueOrThrow({
    where: { id: ids.project },
  });
  const exercisedTypes = [];
  for (const [projectId, documentType] of [
    [ids.psiProject, "PSI"],
    [ids.pcaProject, "PCA"],
  ]) {
    await prisma.project.upsert({
      where: { id: projectId },
      update: { status: "IN_PROGRESS", isActive: true },
      create: {
        id: projectId,
        name: `Synthetic ${documentType} editor project`,
        documentType,
        status: "IN_PROGRESS",
        year: sourceProject.year,
        organizationId: sourceProject.organizationId,
        clientId: sourceProject.clientId,
        buildingId: sourceProject.buildingId,
        userId: sourceProject.userId,
      },
    });
    if (documentType === "PCA") {
      await prisma.pcaConfig.upsert({
        where: { projectId },
        update: {},
        create: {
          projectId,
          planName: "Synthetic PCA editor plan",
          regulatoryReqs: [],
          authoritiesToNotify: [],
        },
      });
    }
    let typedDocument = await call(`/generator/document/${projectId}`, {
      token: advisor.token,
    });
    if (!typedDocument.data?.id) {
      const generated = await call(`/generator/generate/${projectId}`, {
        token: advisor.token,
        method: "POST",
        body: {},
      });
      if (![200, 201].includes(generated.status))
        throw new Error(
          `${documentType} generation failed: ${generated.status}`,
        );
      typedDocument = await call(`/generator/document/${projectId}`, {
        token: advisor.token,
      });
    }
    const typedModule = typedDocument.data?.content?.modules_fr?.find(
      (item) => item.sections?.length,
    );
    const typedSection = typedModule?.sections?.[0];
    if (!typedDocument.data?.id || !typedModule || !typedSection)
      throw new Error(`${documentType} canonical document missing`);
    const richContent = `<h3>${documentType}</h3><p>Contenu <strong>riche</strong> autorisé.</p><table><tbody><tr><td>QA</td></tr></tbody></table>`;
    const saved = await call(
      `/generator/document/${typedDocument.data.id}/module/${typedModule.moduleNumber}/section/${typedSection.id}`,
      {
        token: advisor.token,
        method: "PUT",
        body: {
          content: richContent,
          language: "fr",
          expectedLockVersion: typedDocument.data.lockVersion,
        },
      },
    );
    const reread = await call(`/generator/document/${projectId}`, {
      token: advisor.token,
    });
    const persisted = reread.data?.content?.modules_fr
      ?.find((item) => item.moduleNumber === typedModule.moduleNumber)
      ?.sections?.find((item) => item.id === typedSection.id)?.content;
    exercisedTypes.push({
      documentType,
      saveStatus: saved.status,
      richMarkupPreserved: persisted === richContent,
    });
  }
  record(
    "psi-pca-rich-content-persistence",
    exercisedTypes.every(
      (item) => item.saveStatus === 200 && item.richMarkupPreserved,
    ),
    exercisedTypes,
  );

  const createdMutableVersion = await call(
    `/projects/${ids.project}/versions`,
    {
      token: advisor.token,
      method: "POST",
      body: {
        label: "QA authorized snapshot",
        expectedLockVersion: lockVersion,
      },
    },
  );
  if (![200, 201].includes(createdMutableVersion.status))
    throw new Error(
      `Authorized version creation failed: ${createdMutableVersion.status}`,
    );
  lockVersion = createdMutableVersion.data.lockVersion;
  const authorizedSnapshot = await call(
    `/projects/${ids.project}/versions/${createdMutableVersion.data.id}`,
    { token: advisor.token },
  );
  const forbiddenSnapshot = await call(
    `/projects/${ids.project}/versions/${createdMutableVersion.data.id}`,
    { token: adminB.token },
  );
  record(
    "explicit-version-snapshot-authorization",
    authorizedSnapshot.status === 200 &&
      Boolean(authorizedSnapshot.data?.snapshot) &&
      forbiddenSnapshot.status === 404,
    {
      authorizedStatus: authorizedSnapshot.status,
      crossTenantStatus: forbiddenSnapshot.status,
    },
  );

  const xssPayload = `<img id="qa-stored-xss" src="x-invalid" onerror="document.documentElement.dataset.qaStoredXss='executed'">`;
  const xssSaved = await call(
    `/generator/document/${documentId}/module/${module.moduleNumber}/section/${section.id}`,
    {
      token: advisor.token,
      method: "PUT",
      body: {
        content: xssPayload,
        language: "fr",
        expectedLockVersion: lockVersion,
      },
    },
  );
  lockVersion = xssSaved.data?.lockVersion;
  record(
    "stored-markup-sanitized-by-api",
    xssSaved.status === 200 && Number.isInteger(lockVersion),
    { httpStatus: xssSaved.status },
  );

  await prisma.project.update({
    where: { id: ids.project },
    data: { status: "VALIDATED" },
  });
  const validatedMutation = await call(
    `/generator/document/${documentId}/module/${module.moduleNumber}/section/${section.id}`,
    {
      token: advisor.token,
      method: "PUT",
      body: {
        content: `${originalContent}\nQA validated mutation`,
        language: "fr",
        expectedLockVersion: lockVersion,
      },
    },
  );
  record(
    "validated-document-server-write-denial",
    [403, 409, 422].includes(validatedMutation.status),
    { httpStatus: validatedMutation.status, expected: "403/409/422" },
  );

  await prisma.project.update({
    where: { id: ids.project },
    data: { status: "IN_PROGRESS" },
  });
  await prisma.document.update({
    where: { id: documentId },
    data: { status: "VALIDATED" },
  });
  const validatedDocumentMutation = await call(
    `/generator/document/${documentId}/module/${module.moduleNumber}/section/${section.id}`,
    {
      token: advisor.token,
      method: "PUT",
      body: {
        content: "Forbidden validated document mutation",
        language: "fr",
        expectedLockVersion: lockVersion,
      },
    },
  );
  record(
    "validated-document-status-write-denial",
    [403, 409, 422].includes(validatedDocumentMutation.status),
    { httpStatus: validatedDocumentMutation.status },
  );
  await prisma.document.update({
    where: { id: documentId },
    data: { status: "DRAFT" },
  });
  const concurrentA = `${originalContent}\nQA concurrent A`;
  const concurrentB = `${originalContent}\nQA concurrent B`;
  const concurrent = await Promise.all([
    call(
      `/generator/document/${documentId}/module/${module.moduleNumber}/section/${section.id}`,
      {
        token: advisor.token,
        method: "PUT",
        body: {
          content: concurrentA,
          language: "fr",
          expectedLockVersion: lockVersion,
        },
      },
    ),
    call(
      `/generator/document/${documentId}/module/${module.moduleNumber}/section/${section.id}`,
      {
        token: advisor.token,
        method: "PUT",
        body: {
          content: concurrentB,
          language: "fr",
          expectedLockVersion: lockVersion,
        },
      },
    ),
  ]);
  const concurrentFinal = await call(`/generator/document/${ids.project}`, {
    token: advisor.token,
  });
  const concurrentValue = concurrentFinal.data?.content?.modules_fr
    ?.find((item) => item.moduleNumber === module.moduleNumber)
    ?.sections?.find((item) => item.id === section.id)?.content;
  lockVersion = concurrentFinal.data?.lockVersion;
  record(
    "optimistic-concurrency-conflict",
    concurrent.some((item) => item.status === 409),
    {
      statuses: concurrent.map((item) => item.status),
      finalWriter:
        concurrentValue === concurrentA
          ? "A"
          : concurrentValue === concurrentB
            ? "B"
            : "other",
    },
  );

  await prisma.project.update({
    where: { id: ids.project },
    data: { status: "VALIDATED" },
  });
  const createdVersion = await call(`/projects/${ids.project}/versions`, {
    token: advisor.token,
    method: "POST",
    body: {
      label: "QA validated project version",
      expectedLockVersion: lockVersion,
    },
  });
  record(
    "validated-version-mutation-denial",
    [403, 409, 422].includes(createdVersion.status),
    {
      httpStatus: createdVersion.status,
      createdVersionId: createdVersion.data?.id ?? null,
    },
  );
  const versions = await call(`/projects/${ids.project}/versions`, {
    token: advisor.token,
  });
  record(
    "version-list-minimizes-protected-snapshot",
    Array.isArray(versions.data) &&
      versions.data.every((item) => !Object.hasOwn(item, "snapshot")),
    {
      httpStatus: versions.status,
      snapshotReturned:
        Array.isArray(versions.data) &&
        versions.data.some((item) => Object.hasOwn(item, "snapshot")),
    },
  );

  const archivedDoc = await prisma.document.upsert({
    where: { id: "80000000-0000-4000-8000-000000000002" },
    update: {},
    create: {
      id: "80000000-0000-4000-8000-000000000002",
      title: "Synthetic archived document",
      projectId: ids.archivedProject,
      content: {
        modules_fr: [
          {
            moduleNumber: 1,
            title: "Archive",
            sections: [
              { id: "1.1", title: "Archive", content: "Archived source" },
            ],
          },
        ],
        modules_en: [],
      },
    },
  });
  const archivedMutation = await call(
    `/generator/document/${archivedDoc.id}/module/1/section/1.1`,
    {
      token: advisor.token,
      method: "PUT",
      body: {
        content: "Archived mutated",
        language: "fr",
        expectedLockVersion: archivedDoc.lockVersion,
      },
    },
  );
  record(
    "archived-document-server-write-denial",
    [403, 409, 422].includes(archivedMutation.status),
    { httpStatus: archivedMutation.status },
  );

  const browser = await puppeteer.launch({
    headless: true,
    executablePath:
      process.env.CORO_QA_CHROME ||
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox"],
  });
  try {
    const themes = [
      ["classic", "legacy", "LIGHT"],
      ["glass-light", "glass", "LIGHT"],
      ["glass-dark", "glass", "DARK"],
    ];
    const widths = [390, 768, 1440, 2560];
    for (const [themeName, ui, theme] of themes) {
      for (const width of widths) {
        const page = await browser.newPage();
        const consoleErrors = [];
        page.on("console", (message) => {
          if (message.type() === "error")
            consoleErrors.push(message.text().slice(0, 300));
        });
        await page.setViewport({
          width,
          height: width <= 768 ? 844 : 1000,
          deviceScaleFactor: 1,
        });
        await page.goto(appOrigin, { waitUntil: "domcontentloaded" });
        await page.evaluate(
          ({ token, user, ui, theme }) => {
            localStorage.setItem("coro_token", token);
            localStorage.setItem("coro_user", JSON.stringify(user));
            sessionStorage.setItem("coro_token", token);
            sessionStorage.setItem("coro_user", JSON.stringify(user));
            localStorage.setItem("coro-ui-generation", ui);
            localStorage.setItem("coro-theme-preference", theme);
          },
          { token: advisor.token, user: advisor.user, ui, theme },
        );
        await page.goto(`${appOrigin}/editor/${ids.project}`, {
          waitUntil: "networkidle2",
          timeout: 30000,
        });
        await page.waitForSelector("h1", { timeout: 15000 });
        const geometry = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          xssElement: Boolean(document.querySelector("#qa-stored-xss")),
          xssExecuted:
            document.documentElement.dataset.qaStoredXss === "executed",
          theme: document.documentElement.getAttribute("data-theme"),
          ui: document.documentElement.getAttribute("data-ui"),
          textareas: document.querySelectorAll("textarea").length,
          readOnlyBanner: document.body.innerText.includes("Document approuv"),
        }));
        const screenshot = join(
          evidenceDirectory,
          `editor-${themeName}-${width}.png`,
        );
        await page.screenshot({ path: screenshot, fullPage: true });
        report.browser.push({
          theme: themeName,
          width,
          status:
            geometry.scrollWidth <= geometry.clientWidth ? "PASS" : "FAIL",
          geometry,
          consoleErrors,
        });
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
  const xssObserved = report.browser.some(
    (item) => item.geometry.xssElement || item.geometry.xssExecuted,
  );
  record("stored-content-render-safety", !xssObserved, {
    elementRendered: report.browser.some((item) => item.geometry.xssElement),
    handlerExecuted: report.browser.some((item) => item.geometry.xssExecuted),
  });
  record(
    "browser-matrix-12-of-12",
    report.browser.length === 12 &&
      report.browser.every((item) => item.status === "PASS"),
    {
      passed: report.browser.filter((item) => item.status === "PASS").length,
      total: report.browser.length,
    },
  );
  record(
    "validated-ui-has-no-edit-controls",
    report.browser.every((item) => item.geometry.textareas === 0),
    {
      textareaCounts: [
        ...new Set(report.browser.map((item) => item.geometry.textareas)),
      ],
      readOnlyBannerEverywhere: report.browser.every(
        (item) => item.geometry.readOnlyBanner,
      ),
    },
  );

  await prisma.project.update({
    where: { id: ids.project },
    data: { status: "IN_PROGRESS" },
  });
  const cleanupDocument = await call(`/generator/document/${ids.project}`, {
    token: advisor.token,
  });
  await call(
    `/generator/document/${documentId}/module/${module.moduleNumber}/section/${section.id}`,
    {
      token: advisor.token,
      method: "PUT",
      body: {
        content: originalContent,
        language: "fr",
        expectedLockVersion: cleanupDocument.data.lockVersion,
      },
    },
  );
  await prisma.document.update({
    where: { id: archivedDoc.id },
    data: {
      content: {
        modules_fr: [
          {
            moduleNumber: 1,
            title: "Archive",
            sections: [
              { id: "1.1", title: "Archive", content: "Archived source" },
            ],
          },
        ],
        modules_en: [],
      },
    },
  });
  const versionCleanupDocument = await call(
    `/generator/document/${ids.project}`,
    { token: advisor.token },
  );
  await call(
    `/projects/${ids.project}/versions/${createdMutableVersion.data.id}`,
    {
      token: advisor.token,
      method: "DELETE",
      body: { expectedLockVersion: versionCleanupDocument.data.lockVersion },
    },
  );
  await prisma.document.deleteMany({
    where: { projectId: { in: [ids.psiProject, ids.pcaProject] } },
  });
  await prisma.pcaConfig.deleteMany({ where: { projectId: ids.pcaProject } });
  await prisma.project.deleteMany({
    where: { id: { in: [ids.psiProject, ids.pcaProject] } },
  });
  if ([200, 201].includes(createdVersion.status) && createdVersion.data?.id) {
    await call(`/projects/${ids.project}/versions/${createdVersion.data.id}`, {
      token: advisor.token,
      method: "DELETE",
    });
  }
  report.cleanup = {
    syntheticDocumentRestored: true,
    projectStatusRestored: "IN_PROGRESS",
    createdVersionRemoved: Boolean(createdVersion.data?.id),
  };
} finally {
  await prisma.$disconnect();
}

report.summary = Object.fromEntries(
  ["PASS", "FAIL", "OBSERVED"].map((status) => [
    status,
    report.checks.filter((item) => item.status === status).length,
  ]),
);
await writeFile(
  join(evidenceDirectory, "editor-audit.json"),
  JSON.stringify(report, null, 2),
);
console.log(
  `EDITOR_AUDIT_COMPLETE ${JSON.stringify(report.summary)} browser=${report.browser.filter((item) => item.status === "PASS").length}/${report.browser.length}`,
);
