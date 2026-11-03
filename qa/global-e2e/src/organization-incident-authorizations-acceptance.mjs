#!/usr/bin/env node
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { QaIdentityLab } from "./browser-orchestration.mjs";
import { loadSecretStore } from "./secret-store.mjs";
import { startMfaCaptureAdapter } from "./mfa-capture-adapter.mjs";
import { assertUnderQaRoot } from "./policy.mjs";

const ids = {
  orgA: "10000000-0000-4000-8000-000000000002",
  orgB: "10000000-0000-4000-8000-000000000003",
  clientA: "30000000-0000-4000-8000-000000000001",
  buildingA: "40000000-0000-4000-8000-000000000001",
  portalA: "70000000-0000-4000-8000-000000000007",
};
const output = assertUnderQaRoot(
  process.env.CORO_QA_INCIDENT_AUTH_EVIDENCE ||
    "D:\\CORO-QA\\tracking\\organization-incident-authorizations\\api-acceptance.json",
);
const secrets = await loadSecretStore();
const adapter = await startMfaCaptureAdapter({
  captureDirectory: process.env.CORO_QA_MFA_DIR,
  channelToken: secrets.mfaChannelToken,
});
const lab = new QaIdentityLab({
  apiUrl: process.env.CORO_QA_BACKEND_URL,
  portalUrl: process.env.CORO_QA_PORTAL_URL,
  frontendUrl: process.env.CORO_QA_FRONTEND_URL,
  password: secrets.syntheticPassword,
  mfaAdapterUrl: adapter.url,
  mfaChannelToken: secrets.mfaChannelToken,
});
const root = resolve(fileURLToPath(new URL("../../../", import.meta.url)));
const require = createRequire(resolve(root, "coro-backend/package.json"));
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});
const report = {
  sha: process.env.CORO_QA_COMMIT_SHA,
  executedAt: new Date().toISOString(),
  checks: [],
};
const check = (id, pass, detail) =>
  report.checks.push({ id, status: pass ? "PASS" : "FAIL", detail });

try {
  await prisma.incidentAuthorityAssignment.deleteMany({
    where: {
      organizationId: ids.orgA,
      subjectType: "CLIENT_USER",
      subjectId: ids.portalA,
    },
  });
  await prisma.clientUser.update({
    where: { id: ids.portalA },
    data: { isActive: true, incidentPermissions: [] },
  });
  const auditBaseline = await prisma.adminAuditEvent.count({
    where: { organizationId: ids.orgA },
  });
  const incident = await prisma.incidentEvent.create({
    data: {
      buildingId: ids.buildingA,
      organizationId: ids.orgA,
      type: "OTHER",
      triggeredBy: "QA synthétique",
      description: "Incident autorisations QA",
      occupantsSnapshot: {},
      teamSnapshot: {},
      isExercise: true,
    },
  });
  const [portalA, portalB] = await Promise.all([
    lab.loginAs("clientCorporateA"),
    lab.loginAs("clientOrganizationB"),
  ]);
  const loginInternal = async (email) => {
    const startedAt = Date.now();
    const first = await lab.call("/auth/login", {
      method: "POST",
      body: { email, password: secrets.syntheticPassword },
    });
    const code = await lab.completeMfa({ email, key: email }, startedAt);
    const verified = await lab.call("/auth/verify-mfa", {
      method: "POST",
      body: { email, code },
    });
    return { token: verified.data.access_token, user: verified.data.user };
  };
  const tenantAdmin = await loginInternal("customer-admin-a@global-e2e.test");
  const otherAdmin = await loginInternal("customer-admin-b@global-e2e.test");
  const base = `/clients/${ids.clientA}/client-users/${ids.portalA}`;
  const detailRoute = `/client-portal/incidents/${incident.id}/detail`;

  const noPermission = await lab.call(detailRoute, { token: portalA.token });
  check(
    "double-gate-no-individual-permission",
    noPermission.status === 403,
    `HTTP ${noPermission.status}`,
  );
  const permission = await lab.call(`${base}/incident-permissions`, {
    method: "PUT",
    token: tenantAdmin.token,
    body: {
      permissions: ["INCIDENT_READ"],
      expectedPermissions: [],
      reason: "Recette double garde",
    },
  });
  check(
    "individual-permission-admin",
    permission.status === 200,
    `HTTP ${permission.status}`,
  );
  const noAssignment = await lab.call(detailRoute, { token: portalA.token });
  check(
    "double-gate-no-assignment",
    [403, 404].includes(noAssignment.status),
    `HTTP ${noAssignment.status}`,
  );
  const grantBody = {
    buildingId: ids.buildingA,
    incidentEventId: incident.id,
    operationalRole: "Lecteur incident QA",
    permissions: ["INCIDENT_READ"],
    reason: "Recette affectation gouvernée",
  };
  const grant = await lab.call(`${base}/incident-authorizations`, {
    method: "POST",
    token: tenantAdmin.token,
    headers: { "Idempotency-Key": "incident-auth-qa-00000001" },
    body: grantBody,
  });
  check(
    "admin-grant-atomic",
    grant.status === 201 && grant.data?.assignment?.status === "ACTIVE",
    `HTTP ${grant.status}`,
  );
  const authorized = await lab.call(detailRoute, { token: portalA.token });
  check(
    "double-gate-authorized-detail",
    authorized.status === 200 && authorized.data?.id === incident.id,
    `HTTP ${authorized.status}`,
  );
  const replay = await lab.call(`${base}/incident-authorizations`, {
    method: "POST",
    token: tenantAdmin.token,
    headers: { "Idempotency-Key": "incident-auth-qa-00000001" },
    body: grantBody,
  });
  check(
    "idempotent-replay",
    replay.status === 201 &&
      replay.data?.replayed === true &&
      replay.data?.assignment?.id === grant.data?.assignment?.id,
    `HTTP ${replay.status}`,
  );
  const crossTenant = await lab.call(`${base}/incident-authorizations`, {
    token: otherAdmin.token,
  });
  check(
    "cross-tenant-admin-denied",
    [403, 404].includes(crossTenant.status),
    `HTTP ${crossTenant.status}`,
  );
  const portalDelegation = await lab.call(
    "/client-portal/incidents/authority/assign",
    {
      method: "POST",
      token: portalA.token,
      body: { ...grantBody, subjectId: ids.portalA },
    },
  );
  check(
    "command-does-not-delegate",
    portalDelegation.status === 403,
    `HTTP ${portalDelegation.status}`,
  );
  const badGrant = await lab.call(`${base}/incident-authorizations`, {
    method: "POST",
    token: tenantAdmin.token,
    headers: { "Idempotency-Key": "incident-auth-qa-00000002" },
    body: { ...grantBody, buildingId: "40000000-0000-4000-8000-000000000002" },
  });
  const badRows = await prisma.incidentAuthorityAssignment.count({
    where: {
      organizationId: ids.orgA,
      idempotencyKey: "incident-auth-qa-00000002",
    },
  });
  check(
    "forbidden-scope-no-side-effect",
    [404, 403].includes(badGrant.status) && badRows === 0,
    `HTTP ${badGrant.status}; rows ${badRows}`,
  );
  const revoke = await lab.call(
    `${base}/incident-authorizations/${grant.data.assignment.id}/revoke`,
    {
      method: "PUT",
      token: tenantAdmin.token,
      body: {
        reason: "Fin de la recette QA",
        lockVersion: grant.data.assignment.lockVersion,
      },
    },
  );
  check("admin-revoke", revoke.status === 200, `HTTP ${revoke.status}`);
  const revokedSameSession = await lab.call(detailRoute, {
    token: portalA.token,
  });
  check(
    "revocation-effective-next-request",
    [403, 404].includes(revokedSameSession.status),
    `HTTP ${revokedSameSession.status}`,
  );
  await prisma.clientUser.update({
    where: { id: ids.portalA },
    data: { isActive: false },
  });
  const disabled = await lab.call(detailRoute, { token: portalA.token });
  check(
    "disabled-identity-denied",
    [401, 403].includes(disabled.status),
    `HTTP ${disabled.status}`,
  );
  const auditCount = await prisma.adminAuditEvent.count({
    where: { organizationId: ids.orgA },
  });
  check(
    "immutable-admin-audit",
    auditCount - auditBaseline === 3,
    `${auditCount - auditBaseline} expected audit events`,
  );
  check(
    "second-organization-authenticated",
    Boolean(portalB?.token),
    "synthetic organization B identity used",
  );
  await prisma.clientUser.update({
    where: { id: ids.portalA },
    data: { isActive: true, incidentPermissions: [] },
  });
  await prisma.incidentEvent.delete({ where: { id: incident.id } });
} finally {
  await Promise.allSettled([adapter.close(), prisma.$disconnect()]);
}
report.pass = report.checks.every((item) => item.status === "PASS");
await mkdir(resolve(output, ".."), { recursive: true });
await writeFile(output, JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    { pass: report.pass, evidence: output, checks: report.checks },
    null,
    2,
  ),
);
if (!report.pass) process.exitCode = 1;
