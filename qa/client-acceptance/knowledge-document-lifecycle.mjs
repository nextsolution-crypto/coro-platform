#!/usr/bin/env node
import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { resolveExerciseRexRuntime, sanitizedExerciseRexRuntime } from "../global-e2e/src/exercise-rex-runtime.mjs";
import { loadSecretStore } from "../global-e2e/src/secret-store.mjs";
import { startMfaCaptureAdapter } from "../global-e2e/src/mfa-capture-adapter.mjs";
import { QaIdentityLab } from "../global-e2e/src/browser-orchestration.mjs";

const runtime = resolveExerciseRexRuntime();
const secrets = await loadSecretStore();
const adapter = await startMfaCaptureAdapter({ captureDirectory: runtime.mfaDirectory, channelToken: secrets.mfaChannelToken });
const lab = new QaIdentityLab({
  apiUrl: runtime.apiUrl,
  portalUrl: runtime.portalUrl,
  frontendUrl: runtime.portalUrl,
  password: secrets.syntheticPassword,
  mfaAdapterUrl: adapter.url,
  mfaChannelToken: secrets.mfaChannelToken,
});
const projectId = "50000000-0000-4000-8000-000000000001";
const buildingId = "40000000-0000-4000-8000-000000000001";
const marker = randomUUID().slice(0, 8);
const oldTerm = `ALPHA${marker}`;
const currentTerm = `BRAVO${marker}`;
const technicalTerm = `CHARLIE${marker}`;

function requireStatus(result, expected, label) {
  const accepted = Array.isArray(expected) ? expected : [expected];
  if (!accepted.includes(result.status)) throw new Error(`${label}: HTTP ${result.status}`);
  return result.data;
}

async function upload(token, { name, content, category, parentId }) {
  const form = new FormData();
  form.set("category", category);
  form.set("visibility", "shared");
  if (parentId) form.set("parentId", parentId);
  form.set("file", new Blob([content], { type: "text/plain" }), name);
  const response = await fetch(`${runtime.apiUrl}/project-files/project/${projectId}`, {
    method: "POST", headers: { authorization: `Bearer ${token}` }, body: form,
  });
  return { status: response.status, data: await response.json() };
}

async function approve(token, file, label) {
  let result = await lab.call(`/project-files/${file.id}/review`, {
    method: "PUT", token, body: { lockVersion: file.lockVersion, requestId: randomUUID(), reason: `${label} review` },
  });
  file = requireStatus(result, 200, `${label} review`);
  result = await lab.call(`/project-files/${file.id}/approve`, {
    method: "PUT", token,
    body: { lockVersion: file.lockVersion, requestId: randomUUID(), reason: `${label} approval`, effectiveAt: new Date(Date.now() - 60_000).toISOString(), expiresAt: new Date(Date.now() + 86_400_000).toISOString() },
  });
  return requireStatus(result, 200, `${label} approval`);
}

async function search(token, term) {
  return requireStatus(await lab.call(`/client-portal/knowledge/search?q=${encodeURIComponent(term)}&buildingId=${buildingId}`, { token }), 200, `search ${term}`);
}

try {
  await mkdir(runtime.evidenceDirectory, { recursive: true });
  const advisor = await lab.loginAs("advisor");
  const corporate = await lab.loginAs("clientCorporateA");
  const denied = await lab.loginAs("clientOrganizationB");
  requireStatus(await lab.call(`/projects/${projectId}`, { method: "PUT", token: advisor.token, body: { status: "IN_PROGRESS" } }), 200, "project preparation");

  const v1Content = `Procédure projet ${oldTerm}. La vanne temporaire se trouve en salle P-101.`;
  let v1 = requireStatus(await upload(advisor.token, { name: "procedure-projet-v1.txt", content: v1Content, category: "procedure" }), 201, "v1 upload");
  v1 = await approve(advisor.token, v1, "v1");
  requireStatus(await lab.call(`/knowledge/project-files/${v1.id}/index`, { method: "POST", token: advisor.token }), [200, 201], "v1 indexing");
  const oldBefore = await search(corporate.token, oldTerm);

  const v2Content = `Procédure projet ${currentTerm}. La vanne permanente se trouve en salle P-202.`;
  let v2 = requireStatus(await upload(advisor.token, { name: "procedure-projet-v2.txt", content: v2Content, category: "procedure", parentId: v1.id }), 201, "v2 upload");
  v2 = await approve(advisor.token, v2, "v2");
  requireStatus(await lab.call(`/knowledge/project-files/${v2.id}/index`, { method: "POST", token: advisor.token }), [200, 201], "v2 indexing");
  const oldAfter = await search(corporate.token, oldTerm);
  const currentHits = await search(corporate.token, currentTerm);

  const technicalContent = `Documentation technique bâtiment ${technicalTerm}. Le panneau principal est identifié T-303.`;
  let technical = requireStatus(await upload(advisor.token, { name: "documentation-technique.txt", content: technicalContent, category: "documentation_technique" }), 201, "technical upload");
  technical = await approve(advisor.token, technical, "technical");
  requireStatus(await lab.call(`/knowledge/project-files/${technical.id}/index`, { method: "POST", token: advisor.token }), [200, 201], "technical indexing");
  const technicalHits = await search(corporate.token, technicalTerm);

  requireStatus(await lab.call(`/projects/${projectId}`, { method: "PUT", token: advisor.token, body: { status: "ARCHIVED" } }), 200, "archive");
  const currentAfterArchive = await search(corporate.token, currentTerm);
  const deniedAfterArchive = await search(denied.token, currentTerm);
  const technicalAfterArchive = await search(corporate.token, technicalTerm);

  const revoked = requireStatus(await lab.call(`/project-files/${v2.id}/revoke`, {
    method: "PUT", token: advisor.token, body: { lockVersion: v2.lockVersion, requestId: randomUUID(), reason: "Portal acceptance access-removal proof" },
  }), 200, "v2 revoke");
  const afterRevoke = await search(corporate.token, currentTerm);

  const evidence = {
    schemaVersion: 1,
    completedAt: new Date().toISOString(),
    runtime: sanitizedExerciseRexRuntime(runtime),
    source: {
      v1: { id: v1.id, sha256: createHash("sha256").update(v1Content).digest("hex") },
      v2: { id: v2.id, sha256: createHash("sha256").update(v2Content).digest("hex"), parentId: v2.parentId },
      technical: { id: technical.id, sha256: createHash("sha256").update(technicalContent).digest("hex"), category: technical.category },
    },
    versionReplacement: {
      oldHitsBefore: oldBefore.filter(hit => hit.projectFileId === v1.id).length,
      oldHitsAfter: oldAfter.filter(hit => hit.projectFileId === v1.id).length,
      currentHits: currentHits.filter(hit => hit.projectFileId === v2.id).length,
    },
    archive: {
      currentProjectHits: currentAfterArchive.filter(hit => hit.projectFileId === v2.id).length,
      technicalHits: technicalAfterArchive.filter(hit => hit.projectFileId === technical.id).length,
      unauthorizedHits: deniedAfterArchive.length,
    },
    coexistence: {
      distinctSources: v2.id !== technical.id,
      technicalHits: technicalHits.filter(hit => hit.projectFileId === technical.id).length,
      projectHits: currentHits.filter(hit => hit.projectFileId === v2.id).length,
    },
    accessRemoval: { finalLifecycle: revoked.lifecycleState, hits: afterRevoke.filter(hit => hit.projectFileId === v2.id).length },
    externalProviderTraffic: false,
  };
  evidence.pass = evidence.versionReplacement.oldHitsBefore > 0 && evidence.versionReplacement.oldHitsAfter === 0 && evidence.versionReplacement.currentHits > 0 && evidence.archive.currentProjectHits > 0 && evidence.archive.technicalHits > 0 && evidence.archive.unauthorizedHits === 0 && evidence.coexistence.distinctSources && evidence.coexistence.technicalHits > 0 && evidence.coexistence.projectHits > 0 && evidence.accessRemoval.finalLifecycle === "REVOKED" && evidence.accessRemoval.hits === 0;
  await writeFile(join(runtime.evidenceDirectory, "knowledge-document-lifecycle.json"), JSON.stringify(evidence, null, 2));
  console.log(`KNOWLEDGE_DOCUMENT_LIFECYCLE_${evidence.pass ? "PASS" : "FAIL"}`);
  if (!evidence.pass) process.exitCode = 1;
} finally {
  await Promise.all(["advisor", "clientCorporateA", "clientOrganizationB"].map(key => lab.logout(key).catch(() => undefined)));
  await adapter.close();
}
