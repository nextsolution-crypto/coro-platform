#!/usr/bin/env node
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";

const api = (process.env.CORO_QA_BACKEND_URL || "http://127.0.0.1:3166/api").replace(/\/$/, "");
const password = process.env.CORO_QA_SYNTHETIC_PASSWORD;
const mfaDirectory = process.env.CORO_QA_MFA_DIR;
const output = process.env.CORO_QA_EVIDENCE;
if (!password || !mfaDirectory || !output) throw new Error("QA configuration incomplete");

const projectId = "50000000-0000-4000-8000-000000000001";
const report = { generatedAt: new Date().toISOString(), testedCommit: process.env.CORO_QA_TESTED_COMMIT, core: [], doc: [] };

async function call(route, { token, method = "GET", body, binary = false, headers = {} } = {}) {
  const response = await fetch(`${api}${route}`, {
    method,
    headers: { ...(body === undefined ? {} : { "content-type": "application/json" }), ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  if (binary) return { status: response.status, bytes, contentType: response.headers.get("content-type"), disposition: response.headers.get("content-disposition") };
  const text = bytes.toString("utf8");
  let data = text;
  try { data = JSON.parse(text); } catch {}
  return { status: response.status, data };
}

async function latestCode(email, after) {
  const files = await Promise.all((await readdir(mfaDirectory)).map(async name => ({ name, time: (await stat(join(mfaDirectory, name))).mtimeMs })));
  for (const file of files.sort((a, b) => b.time - a.time)) {
    if (file.time < after - 2000) break;
    const message = JSON.parse(await readFile(join(mfaDirectory, file.name), "utf8"));
    if (String(message.to).toLowerCase() === email) return /\b(\d{6})\b/.exec(message.subject)?.[1];
  }
  throw new Error(`MFA capture missing for ${email}`);
}

async function login(email) {
  const after = Date.now();
  const challenge = await call("/auth/login", { method: "POST", body: { email, password } });
  if (![200, 201].includes(challenge.status) || !challenge.data?.mfaRequired) throw new Error(`Login challenge failed: ${email} ${challenge.status}`);
  const verified = await call("/auth/verify-mfa", { method: "POST", body: { email, code: await latestCode(email, after) } });
  const token = verified.data?.access_token ?? verified.data?.token;
  if (![200, 201].includes(verified.status) || !token) throw new Error(`MFA failed: ${email} ${verified.status}`);
  return token;
}

function check(domain, id, pass, observed) {
  report[domain].push({ id, status: pass ? "PASS" : "FAIL", observed });
}

const [advisor, adminA] = await Promise.all([
  login("advisor-a@global-e2e.test"),
  login("customer-admin-a@global-e2e.test"),
]);
// Respect the canonical five-attempt authentication window. This is an
// ordinary wait, not a rate-limit reset or identity rotation.
await new Promise(resolve => setTimeout(resolve, 61_000));
const adminB = await login("customer-admin-b@global-e2e.test");

for (const [name, token, expected] of [["advisor", advisor, true], ["admin-a", adminA, true], ["admin-b", adminB, false]]) {
  const list = await call("/projects", { token });
  const direct = await call(`/projects/${projectId}`, { token });
  const listed = Array.isArray(list.data) && list.data.some(item => item.id === projectId);
  const visible = direct.status === 200 && direct.data?.id === projectId;
  check("core", `${name}-list-direct-parity`, expected ? listed && visible : !listed && !visible && [403, 404].includes(direct.status), { listStatus: list.status, listed, directStatus: direct.status, visible });
}

const revoked = await call("/auth/login", { method: "POST", body: { email: "revoked@global-e2e.test", password } });
check("core", "revoked-identity-denial", [401, 403].includes(revoked.status), { httpStatus: revoked.status });

const config = {
  province: "QC", responsableNom: "Conseiller synthétique", responsableTitre: "Responsable QA",
  dateReleve: "2026-10-25", versionDocument: "Recette DOC-01", floors: 3,
  buildingType: "office", multiLocataires: true, gicleurs: true, generatrice: true,
  ascenseurs: true, matieresDangereuses: false,
};
const configured = await call(`/projects/${projectId}`, { token: advisor, method: "PUT", body: { configData: config } });
check("doc", "configuration-canonical-save", configured.status === 200 && configured.data?.configData?.versionDocument === config.versionDocument, { httpStatus: configured.status, savedVersion: configured.data?.configData?.versionDocument });

const currentDocument = await call(`/generator/document/${projectId}`, { token: advisor });
const generated = await call(`/generator/generate/${projectId}`, {
  token: advisor,
  method: "POST",
  body: {},
  headers: {
    "Idempotency-Key": crypto.randomUUID(),
    "X-Expected-Document-Version": String(currentDocument.data?.version ?? 0),
  },
});
const documentId = generated.data?.documentId;
check("doc", "generation", generated.status === 201 && Boolean(documentId), { httpStatus: generated.status, documentId: documentId ?? null, version: generated.data?.version });

const before = await call(`/generator/document/${projectId}`, { token: advisor });
const firstModule = before.data?.content?.modules_fr?.[0];
const firstSection = firstModule?.sections?.[0];
const editedText = "Contenu DOC-01 synthétique édité et vérifié.";
const edited = documentId && firstModule && firstSection ? await call(`/generator/document/${documentId}/module/${firstModule.moduleNumber}/section/${firstSection.id}`, { token: advisor, method: "PUT", body: { content: editedText, language: "fr" } }) : { status: 0 };
const after = await call(`/generator/document/${projectId}`, { token: advisor });
const persisted = after.data?.content?.modules_fr?.find(item => item.moduleNumber === firstModule?.moduleNumber)?.sections?.find(item => item.id === firstSection?.id)?.content;
check("doc", "edition-persistence", edited.status === 200 && persisted === editedText, { httpStatus: edited.status, persisted: persisted === editedText });

const validation = await call(`/generator/validate/${projectId}`, { token: advisor });
check("doc", "validation", validation.status === 200 && typeof validation.data === "object", { httpStatus: validation.status, valid: validation.data?.isValid ?? validation.data?.valid ?? null, errorCount: validation.data?.errors?.length ?? null });

const pdf = await call(`/projects/${projectId}/export`, { token: advisor, method: "POST", body: { selectedModules: [1,2,3,4,6,7,8], moduleOrder: [1,2,3,4,6,7,8], language: "fr", isPreview: true }, binary: true });
const pdfValid = pdf.status === 201 && pdf.contentType?.includes("application/pdf") && pdf.bytes.subarray(0, 5).toString("ascii") === "%PDF-" && pdf.bytes.length > 1000;
const pdfSha256 = pdfValid ? createHash("sha256").update(pdf.bytes).digest("hex") : null;
if (pdfValid) await writeFile(join(output, "DOC-01-preview.pdf"), pdf.bytes);
check("doc", "pdf-download-openable", pdfValid, { httpStatus: pdf.status, contentType: pdf.contentType, size: pdf.bytes.length, sha256: pdfSha256, disposition: pdf.disposition });

const crossTenantDocument = await call(`/generator/document/${projectId}`, { token: adminB });
const crossTenantPdf = await call(`/projects/${projectId}/export`, { token: adminB, method: "POST", body: { selectedModules: [1], moduleOrder: [1], language: "fr", isPreview: true }, binary: true });
check("doc", "cross-tenant-private-denial", [403,404].includes(crossTenantDocument.status) && [403,404].includes(crossTenantPdf.status) && !crossTenantPdf.contentType?.includes("application/pdf"), { documentStatus: crossTenantDocument.status, exportStatus: crossTenantPdf.status, contentType: crossTenantPdf.contentType });

const submitted = await call(`/approval/${projectId}/submit`, { token: advisor, method: "POST" });
check("doc", "review-submit", submitted.status === 201 && submitted.data?.status === "REVIEW", { httpStatus: submitted.status, state: submitted.data?.status });
const selfApprove = await call(`/approval/${projectId}/approve`, { token: advisor, method: "POST" });
check("doc", "author-approval-denial", [403,404].includes(selfApprove.status), { httpStatus: selfApprove.status });
const approved = await call(`/approval/${projectId}/approve`, { token: adminA, method: "POST" });
check("doc", "independent-approval", approved.status === 201 && approved.data?.status === "VALIDATED", { httpStatus: approved.status, state: approved.data?.status, version: approved.data?.version });

const finalProject = await call(`/projects/${projectId}`, { token: advisor });
check("doc", "version-and-binding", finalProject.status === 200 && finalProject.data?.id === projectId && finalProject.data?.buildingId === "40000000-0000-4000-8000-000000000001" && finalProject.data?.status === "VALIDATED", { httpStatus: finalProject.status, projectId: finalProject.data?.id, buildingId: finalProject.data?.buildingId, state: finalProject.data?.status });

report.pass = [...report.core, ...report.doc].every(item => item.status === "PASS");
await mkdir(output, { recursive: true });
await writeFile(join(output, "core-doc-api.json"), JSON.stringify(report, null, 2));
console.log(`CORE_DOC_API_${report.pass ? "PASS" : "FAIL"}: ${[...report.core, ...report.doc].filter(item => item.status === "PASS").length}/${report.core.length + report.doc.length}`);
if (!report.pass) process.exitCode = 1;
