#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { resolveExerciseRexRuntime, sanitizedExerciseRexRuntime } from "./exercise-rex-runtime.mjs";
import { loadSecretStore } from "./secret-store.mjs";
import { startMfaCaptureAdapter } from "./mfa-capture-adapter.mjs";
import { QaIdentityLab } from "./browser-orchestration.mjs";
import { runExerciseRexBrowser } from "./exercise-rex-browser-campaign.mjs";

const runtime = resolveExerciseRexRuntime();
const secrets = await loadSecretStore();
const adapter = await startMfaCaptureAdapter({ captureDirectory: runtime.mfaDirectory, channelToken: secrets.mfaChannelToken });
const lab = new QaIdentityLab({ apiUrl: runtime.apiUrl, portalUrl: runtime.portalUrl, frontendUrl: runtime.portalUrl, password: secrets.syntheticPassword, mfaAdapterUrl: adapter.url, mfaChannelToken: secrets.mfaChannelToken });
const repositoryRoot = resolve(fileURLToPath(new URL("../../../", import.meta.url)));
const require = createRequire(join(repositoryRoot, "coro-backend", "package.json"));
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();
const ids = { operator: "10000000-0000-4000-8000-000000000001", org: "10000000-0000-4000-8000-000000000002", client: "30000000-0000-4000-8000-000000000001", project: "50000000-0000-4000-8000-000000000001", reviewer: "20000000-0000-4000-8000-000000000002", approver: "20000000-0000-4000-8000-000000000043", activity: "43000000-0000-4000-8000-000000000081", portalManager: "70000000-0000-4000-8000-000000000004", portalCorporate: "70000000-0000-4000-8000-000000000007" };
const transition = (reason, lockVersion) => ({ lockVersion, requestId: randomUUID(), reason });

try {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  await mkdir(runtime.evidenceDirectory, { recursive: true });
  const hash = await bcrypt.hash(secrets.syntheticPassword, 10);
  await prisma.user.upsert({ where: { id: ids.approver }, update: { isActive: true, password: hash }, create: { id: ids.approver, email: "p81-approver@global-e2e.test", password: hash, firstName: "P81", lastName: "Approver", role: "OPERATOR", organizationId: ids.operator, isActive: true } });
  await prisma.project.update({ where: { id: ids.project }, data: { lastEditedById: ids.approver } });
  await prisma.projectActivity.upsert({ where: { id: ids.activity }, update: {}, create: { id: ids.activity, projectId: ids.project, type: "exercice_table", label: "P-8.1 representative exercise", duration: "120 min", status: "termine", organizationId: ids.org, scheduledDate: new Date("2026-10-22T14:00:00Z") } });
  const founder = await lab.loginAs("founder");
  const advisor = await lab.loginAs("delegatedEmployee");
  let authority = await lab.call("/admin/v1/platform-authority/draft", { method: "POST", token: founder.token, body: { operatorOrganizationId: ids.operator, founderUserId: "20000000-0000-4000-8000-000000000001", reason: "Governed P-8.1 QA initialization" } });
  if (authority.status >= 300) throw new Error(`authority draft failed:${authority.status}`);
  authority = await lab.call("/admin/v1/platform-authority/activate", { method: "POST", token: founder.token, body: { lockVersion: authority.data.lockVersion, reason: "Governed P-8.1 QA activation" } });
  if (authority.status >= 300 || authority.data.status !== "ACTIVE") throw new Error(`authority activation failed:${authority.status}`);
  const grant = async (userId, permission) => lab.call("/admin/v1/platform-authority/grants", { method: "POST", token: founder.token, body: { userId, permission, scope: "ORGANIZATION", targetOrganizationId: ids.org, reason: "P-8.1 explicit synthetic authority" } });
  for (const [userId, permission] of [[ids.reviewer, "EXERCISE_REPORT_REVIEW"], [ids.reviewer, "EXERCISE_REPORT_PUBLISH"], [ids.approver, "EXERCISE_REPORT_APPROVE"]]) {
    const result = await grant(userId, permission); if (result.status >= 300) throw new Error(`grant ${permission} failed:${result.status}`);
  }
  const approverStart = Date.now();
  const first = await lab.call("/auth/login", { method: "POST", body: { email: "p81-approver@global-e2e.test", password: secrets.syntheticPassword } });
  if (first.status >= 300 || !first.data?.mfaRequired) throw new Error("approver login failed");
  const code = await lab.completeMfa({ key: "p81Approver", email: "p81-approver@global-e2e.test" }, approverStart);
  const verified = await lab.call("/auth/verify-mfa", { method: "POST", body: { email: "p81-approver@global-e2e.test", code } });
  const approverToken = verified.data.access_token;
  let response = await lab.call(`/activities/${ids.activity}/exercise-report`, { method: "POST", token: advisor.token, body: {} });
  if (response.status >= 300) throw new Error(`create failed:${response.status}`);
  const reportId = response.data.id;
  response = await lab.call(`/exercise-reports/${reportId}`, {
    method: "PUT",
    token: advisor.token,
    body: {
      scenario: "Synthetic P-8.1 continuity exercise",
      timelineEntries: [
        { key: "timeline-alarm", order: 0, type: "INPUT", event: "Alarm initiated", description: "Canonical synthetic exercise input", sourceRef: `ProjectActivity:${ids.activity}` },
        { key: "timeline-response", order: 1, type: "RESPONSE", event: "Team response recorded", description: "Synthetic response observation", sourceRef: `ProjectActivity:${ids.activity}` },
      ],
      findings: [
        { key: "finding-egress", order: 0, type: "GAP", title: "Egress coordination gap", description: "A controlled delay was observed during the exercise.", priority: "WARNING", sourceRef: `ProjectActivity:${ids.activity}` },
      ],
      recommendations: [
        { key: "recommendation-egress", findingKey: "finding-egress", order: 0, text: "Clarify the egress coordination checklist.", priority: "WARNING", sourceRef: `ExerciseReport:${reportId}` },
      ],
      actionItems: [
        { key: "action-egress", findingKey: "finding-egress", recommendationKey: "recommendation-egress", order: 0, title: "Update egress checklist", description: "Create and verify the revised checklist.", assignedTo: "Synthetic responsible actor", dueDate: "2026-11-15T17:00:00.000Z", priority: "WARNING", sourceRef: `ExerciseReport:${reportId}` },
        { key: "action-egress-concurrent", findingKey: "finding-egress", recommendationKey: "recommendation-egress", order: 1, title: "Validate concurrent follow-up", description: "Prove single canonical materialization under concurrent requests.", assignedTo: "Synthetic responsible actor", dueDate: "2026-11-20T17:00:00.000Z", priority: "INFO", sourceRef: `ExerciseReport:${reportId}` },
      ],
    },
  });
  if (response.status >= 300) throw new Error(`draft traceability update failed:${response.status}`);
  const draftTraceability = await prisma.exerciseReport.findUniqueOrThrow({ where: { id: reportId }, select: { actionItems: { select: { id: true, key: true } } } });
  const actionItemId = draftTraceability.actionItems.find((item) => item.key === "action-egress")?.id;
  const concurrentActionItemId = draftTraceability.actionItems.find((item) => item.key === "action-egress-concurrent")?.id;
  if (!actionItemId || !concurrentActionItemId) throw new Error("canonical exercise action items were not persisted");

  const updatePermissions = async (clientUserId, permissions) => {
    const result = await lab.call(`/admin/organizations/${ids.org}/clients/${ids.client}/client-users/${clientUserId}/operational-permissions`, {
      method: "PUT", token: founder.token, body: { correctiveActionPermissions: permissions },
    });
    if (result.status >= 300) throw new Error(`permission provisioning failed:${clientUserId}:${result.status}`);
  };
  await updatePermissions(ids.portalManager, ["CORRECTIVE_ACTION_CREATE", "CORRECTIVE_ACTION_EDIT", "CORRECTIVE_ACTION_COMPLETE"]);
  await updatePermissions(ids.portalCorporate, ["CORRECTIVE_ACTION_VERIFY", "CORRECTIVE_ACTION_CLOSE"]);
  const manager = await lab.loginAs("clientLocalA");
  const corporate = await lab.loginAs("clientCorporateA");
  const otherTenant = await lab.loginAs("clientOrganizationB");
  const unauthorized = await lab.loginAs("clientRegionalA");
  const withoutBuilding = await lab.loginAs("clientWithoutBuildings");
  const revokedActor = await lab.loginAs("revokedUser");
  if (!revokedActor.denied) throw new Error("revoked actor authentication was not denied");

  let materialization = await lab.call(`/client-portal/exercise-action-items/${actionItemId}/corrective-action`, {
    method: "POST", token: manager.token, body: { justification: "P-8.1 governed continuity before publication denial" },
  });
  if (materialization.status !== 409) throw new Error(`draft materialization should be denied with 409, got:${materialization.status}`);
  const deniedPermission = await lab.call(`/client-portal/exercise-action-items/${actionItemId}/corrective-action`, { method: "POST", token: unauthorized.token, body: { justification: "Must be denied" } });
  if (deniedPermission.status !== 403) throw new Error(`missing explicit permission should be denied:${deniedPermission.status}`);
  const deniedBuilding = await lab.call(`/client-portal/exercise-action-items/${actionItemId}`, { token: withoutBuilding.token });
  if (![403, 404].includes(deniedBuilding.status)) throw new Error(`empty building scope should be denied:${deniedBuilding.status}`);
  for (const [route, token, reason] of [["submit-review", advisor.token, "Submit P81"], ["review", advisor.token, "Review P81"], ["approve", approverToken, "Approve P81"], ["publish", advisor.token, "Publish P81"]]) {
    response = await lab.call(`/exercise-reports/${reportId}/${route}`, { method: "POST", token, body: transition(reason, response.data.lockVersion) });
    if (response.status >= 300) throw new Error(`${route} failed:${response.status}`);
  }
  const pdf = await fetch(`${runtime.apiUrl}/exercise-reports/${reportId}/versions/1/download`, { headers: { authorization: `Bearer ${advisor.token}` } });
  const closure = await fetch(`${runtime.apiUrl}/exercise-reports/${reportId}/closure-export`, { headers: { authorization: `Bearer ${advisor.token}` } });
  if (!pdf.ok || !closure.ok) throw new Error("official artifacts failed");
  const traceability = await prisma.exerciseReport.findUniqueOrThrow({
    where: { id: reportId },
    include: { timelineEntries: true, findings: true, recommendations: true, actionItems: true },
  });
  materialization = await lab.call(`/client-portal/exercise-action-items/${actionItemId}/corrective-action`, {
    method: "POST", token: manager.token, body: { justification: "Materialize the governed P-8.1 exercise improvement action" },
  });
  if (materialization.status >= 300) throw new Error(`materialization failed:${materialization.status}`);
  const correctiveActionId = materialization.data.id;
  const repeated = await lab.call(`/client-portal/exercise-action-items/${actionItemId}/corrective-action`, {
    method: "POST", token: manager.token, body: { justification: "Idempotent repeated request" },
  });
  if (repeated.status >= 300 || repeated.data.id !== correctiveActionId) throw new Error(`materialization replay failed:${repeated.status}`);
  const concurrentResults = await Promise.all([1, 2].map((attempt) => lab.call(`/client-portal/exercise-action-items/${concurrentActionItemId}/corrective-action`, {
    method: "POST", token: manager.token, body: { justification: `Concurrent governed request ${attempt}` },
  })));
  if (concurrentResults.some((item) => item.status >= 300) || new Set(concurrentResults.map((item) => item.data.id)).size !== 1) {
    throw new Error(`concurrent materialization did not converge:${concurrentResults.map((item) => item.status).join(",")}`);
  }
  const concurrentCount = await prisma.correctiveAction.count({ where: { exerciseActionItemId: concurrentActionItemId } });
  if (concurrentCount !== 1) throw new Error(`concurrent materialization created ${concurrentCount} records`);
  const crossTenant = await lab.call(`/client-portal/exercise-action-items/${actionItemId}`, { token: otherTenant.token });
  if (![403, 404].includes(crossTenant.status)) throw new Error(`cross-tenant source access was not denied:${crossTenant.status}`);
  let lifecycle = await lab.call(`/client-portal/corrective-actions/${correctiveActionId}`, { method: "PUT", token: manager.token, body: { status: "IN_PROGRESS" } });
  if (lifecycle.status >= 300) throw new Error(`corrective action start failed:${lifecycle.status}`);
  lifecycle = await lab.call(`/client-portal/corrective-actions/${correctiveActionId}/complete`, { method: "POST", token: manager.token, body: { completionComment: "Synthetic P-8.1 corrective work completed" } });
  if (lifecycle.status >= 300 || lifecycle.data.status !== "COMPLETED") throw new Error(`corrective action completion failed:${lifecycle.status}`);
  lifecycle = await lab.call(`/client-portal/corrective-actions/${correctiveActionId}/verify`, { method: "POST", token: corporate.token, body: { clientIntentId: randomUUID(), verdict: "ACCEPTED", comment: "Independent synthetic verification" } });
  if (lifecycle.status >= 300 || lifecycle.data.status !== "VERIFIED") throw new Error(`corrective action verification failed:${lifecycle.status}`);
  lifecycle = await lab.call(`/client-portal/corrective-actions/${correctiveActionId}/close`, { method: "POST", token: corporate.token, body: { closureComment: "Governed P-8.1 closure" } });
  if (lifecycle.status >= 300 || lifecycle.data.status !== "CLOSED") throw new Error(`corrective action closure failed:${lifecycle.status}`);
  const correctiveAction = await prisma.correctiveAction.findUnique({ where: { exerciseActionItemId: actionItemId }, include: { auditEvents: true, verifications: true } });
  const networkBuilding = await lab.call(`/client-portal/network/buildings/40000000-0000-4000-8000-000000000001`, { token: corporate.token });
  if (networkBuilding.status >= 300) throw new Error(`Network building reporting failed:${networkBuilding.status}`);
  const networkAction = networkBuilding.data?.actionSummary?.items?.find((item) => item.id === correctiveActionId);
  if (!networkAction || networkAction.status !== "CLOSED" || networkAction.source !== "EXERCISE") {
    throw new Error(`Network did not report the closed exercise action:${JSON.stringify(networkAction ?? null)}`);
  }
  const browserReport = await runExerciseRexBrowser({ runtime, lab, source: { actionItemId, correctiveActionId, buildingId: "40000000-0000-4000-8000-000000000001" } });
  if (browserReport.status !== "PASS") throw new Error(`browser matrix failed:${browserReport.results.filter((item) => item.status === "PASS").length}/12`);
  const evidence = {
    status: correctiveAction ? "PASS" : "PARTIAL",
    runtime: sanitizedExerciseRexRuntime(runtime),
    reportId,
    finalStatus: response.data.status,
    pdfSha256: pdf.headers.get("x-content-sha256"),
    closureSha256: closure.headers.get("x-content-sha256"),
    browserMatrix: `${browserReport.results.filter((item) => item.status === "PASS").length}/12`,
    traceability: {
      timelineEntries: traceability.timelineEntries.length,
      findings: traceability.findings.length,
      recommendations: traceability.recommendations.length,
      actionItems: traceability.actionItems.length,
      linkedCorrectiveAction: Boolean(correctiveAction),
      correctiveActionStatus: correctiveAction?.status,
      correctiveActionAuditEvents: correctiveAction?.auditEvents.length,
      correctiveActionVerifications: correctiveAction?.verifications.length,
      idempotentReplay: repeated.data.id === correctiveActionId,
      crossTenantDenial: crossTenant.status,
      unauthorizedCreationDenial: deniedPermission.status,
      emptyBuildingScopeDenial: deniedBuilding.status,
      revokedActorDenial: revokedActor.status,
      concurrentMaterialization: { sameId: true, persistedCount: concurrentCount },
      networkReporting: { actionId: networkAction.id, status: networkAction.status, source: networkAction.source },
    },
  };
  await writeFile(join(runtime.evidenceDirectory, "exercise-report-lifecycle.json"), JSON.stringify(evidence, null, 2));
  if (!correctiveAction) {
    throw new Error("No canonical CorrectiveAction materialization path exists for the ExerciseReport action item");
  }
  console.log(JSON.stringify(evidence));
} finally { await prisma.$disconnect(); await adapter.close(); }
