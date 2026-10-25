#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { resolveExerciseRexRuntime, sanitizedExerciseRexRuntime } from "../global-e2e/src/exercise-rex-runtime.mjs";
import { loadSecretStore } from "../global-e2e/src/secret-store.mjs";
import { startMfaCaptureAdapter } from "../global-e2e/src/mfa-capture-adapter.mjs";
import { QaIdentityLab } from "../global-e2e/src/browser-orchestration.mjs";

const runtime = resolveExerciseRexRuntime();
const secrets = await loadSecretStore();
const adapter = await startMfaCaptureAdapter({ captureDirectory: runtime.mfaDirectory, channelToken: secrets.mfaChannelToken });
const lab = new QaIdentityLab({ apiUrl: runtime.apiUrl, portalUrl: runtime.portalUrl, frontendUrl: runtime.portalUrl, password: secrets.syntheticPassword, mfaAdapterUrl: adapter.url, mfaChannelToken: secrets.mfaChannelToken });
const projectId = "50000000-0000-4000-8000-000000000001";
const report = { schemaVersion: 1, completedAt: null, runtime: sanitizedExerciseRexRuntime(runtime), checks: [] };
const check = (id, pass, observed) => report.checks.push({ id, status: pass ? "PASS" : "FAIL", observed });

async function download(path, token) {
  const response = await fetch(`${runtime.apiUrl}${path}`, { headers: token ? { authorization: `Bearer ${token}` } : {} });
  const bytes = Buffer.from(await response.arrayBuffer());
  return { status: response.status, contentType: response.headers.get("content-type"), bytes };
}

try {
  await mkdir(runtime.evidenceDirectory, { recursive: true });
  const advisor = await lab.loginAs("advisor");
  const corporate = await lab.loginAs("clientCorporateA");
  const tenantB = await lab.loginAs("clientOrganizationB");
  let source = await lab.call(`/generator/document/${projectId}`, { token: advisor.token });
  if (source.status === 404 || !source.data?.id) {
    source = await lab.call(`/generator/generate/${projectId}`, { method: "POST", token: advisor.token, body: {} });
  }
  check("canonical-source-document", [200, 201].includes(source.status) && Boolean(source.data?.id), { httpStatus: source.status, id: source.data?.id, version: source.data?.version });
  const before = await lab.call(`/client-portal/projects/${projectId}/sign-status`, { token: corporate.token });
  check("eligible-status", before.status === 200, { httpStatus: before.status, status: before.data?.status });
  const signed = await lab.call(`/client-portal/projects/${projectId}/sign`, { method: "POST", token: corporate.token, body: { fullName: "Synthetic QA Signatory", comment: "Non-binding isolated QA acceptance" } });
  check("synthetic-signature", [200, 201].includes(signed.status), { httpStatus: signed.status, status: signed.data?.status });

  let status = signed;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    status = await lab.call(`/client-portal/projects/${projectId}/sign-status`, { token: corporate.token });
    if (status.data?.officialPdfFr || status.data?.pdfReady || status.data?.status === "COMPLETED") break;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  const privateReferences = [status.data?.officialPdfFr, status.data?.officialPdfEn];
  check("materialization-status", status.status === 200 && status.data?.status === "READY", { httpStatus: status.status, status: status.data?.status, pdfReady: privateReferences.every(value => typeof value === "string") });
  check("private-reference-format", privateReferences.every(value => typeof value === "string" && value.startsWith("coro-private:v1:") && !value.includes("http")), {
    frPrivate: typeof privateReferences[0] === "string" && privateReferences[0].startsWith("coro-private:v1:"),
    enPrivate: typeof privateReferences[1] === "string" && privateReferences[1].startsWith("coro-private:v1:"),
    publicUrlPersisted: privateReferences.some(value => typeof value === "string" && /^https?:/i.test(value)),
  });

  const retry = await lab.call(`/client-portal/projects/${projectId}/sign/retry`, { method: "POST", token: corporate.token, body: {} });
  check("idempotent-retry", retry.status === 201 && retry.data?.status === "READY" && retry.data?.officialPdfFr === privateReferences[0] && retry.data?.officialPdfEn === privateReferences[1], {
    httpStatus: retry.status,
    status: retry.data?.status,
    referencesStable: retry.data?.officialPdfFr === privateReferences[0] && retry.data?.officialPdfEn === privateReferences[1],
  });

  const pdf = await download(`/client-portal/projects/${projectId}/official/fr`, corporate.token);
  const validPdf = pdf.status === 200 && pdf.contentType?.includes("application/pdf") && pdf.bytes.subarray(0, 5).toString("ascii") === "%PDF-" && pdf.bytes.length > 1000;
  check("official-pdf", validPdf, { httpStatus: pdf.status, contentType: pdf.contentType, byteLength: pdf.bytes.length, sha256: validPdf ? createHash("sha256").update(pdf.bytes).digest("hex") : null });

  const anonymous = await download(`/client-portal/projects/${projectId}/official/fr`);
  check("anonymous-denial", [401, 403].includes(anonymous.status), { httpStatus: anonymous.status });
  const crossTenant = await download(`/client-portal/projects/${projectId}/official/fr`, tenantB.token);
  check("cross-tenant-denial", [403, 404].includes(crossTenant.status), { httpStatus: crossTenant.status });

  report.completedAt = new Date().toISOString();
  report.pass = report.checks.every(item => item.status === "PASS");
  await writeFile(join(runtime.evidenceDirectory, "signature-official.json"), JSON.stringify(report, null, 2));
  console.log(`SIGNATURE_OFFICIAL_${report.pass ? "PASS" : "FAIL"}: ${report.checks.filter(item => item.status === "PASS").length}/${report.checks.length}`);
  if (!report.pass) process.exitCode = 1;
} finally {
  await Promise.all(["advisor", "clientCorporateA", "clientOrganizationB"].map(key => lab.logout(key).catch(() => undefined)));
  await adapter.close();
}
