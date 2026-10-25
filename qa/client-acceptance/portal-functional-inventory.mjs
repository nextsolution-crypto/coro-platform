#!/usr/bin/env node
import { randomUUID } from "node:crypto";
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
const buildingA = "40000000-0000-4000-8000-000000000001";
const projectA = "50000000-0000-4000-8000-000000000001";
const evidence = { schemaVersion: 1, completedAt: null, runtime: sanitizedExerciseRexRuntime(runtime), reads: [], denials: [], mutations: [], defects: [] };
const record = (area, id, pass, observed) => evidence[area].push({ id, status: pass ? "PASS" : "FAIL", observed });
const get = (path, token) => lab.call(path, { token });

try {
  await mkdir(runtime.evidenceDirectory, { recursive: true });
  const corporate = await lab.loginAs("clientCorporateA");
  const manager = await lab.loginAs("clientLocalA");
  const zero = await lab.loginAs("clientWithoutBuildings");
  const tenantB = await lab.loginAs("clientOrganizationB");

  const readCases = [
    ["dashboard", "/client-portal/dashboard"], ["projects", "/client-portal/projects"],
    ["activities", "/client-portal/activities"], ["bookings", "/client-portal/bookings"],
    ["buildings", "/client-portal/buildings"], ["readiness", "/client-portal/buildings-readiness"],
    ["notifications", "/client-portal/notifications"], ["manual", "/client-portal/user-manual"],
    ["employees", `/client-portal/buildings/${buildingA}/sentinelle/employees`],
    ["invitations", `/client-portal/buildings/${buildingA}/sentinelle/invitations`],
    ["evacuations", `/client-portal/buildings/${buildingA}/sentinelle/evacuations`],
    ["incident-history", `/client-portal/incidents/buildings/${buildingA}/history`],
    ["population-status", `/client-portal/buildings/${buildingA}/population/status`],
    ["resilience-history", `/client-portal/buildings/${buildingA}/resilience-history?days=90`],
  ];
  for (const [id, path] of readCases) {
    const response = await get(path, corporate.token);
    const permissionGated = id === "incident-history" && response.status === 403;
    record("reads", id, response.status === 200 || permissionGated, { httpStatus: response.status, permissionGated, count: Array.isArray(response.data) ? response.data.length : undefined });
  }
  for (const [id, actor] of [["manager-no-building", zero], ["cross-tenant", tenantB]]) {
    for (const [resource, path] of [["employees", `/client-portal/buildings/${buildingA}/sentinelle/employees`], ["invitations", `/client-portal/buildings/${buildingA}/sentinelle/invitations`], ["history", `/client-portal/incidents/buildings/${buildingA}/history`]]) {
      const response = await get(path, actor.token);
      record("denials", `${id}-${resource}`, [403, 404].includes(response.status), { httpStatus: response.status });
    }
  }

  const future = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 16);
  const booking = await lab.call(`/client-portal/projects/${projectA}/bookings`, { method: "POST", token: corporate.token, body: { activityType: "visite", requestedLocalDateTime: future, duration: 60, participants: 2, comment: "QA synthetic booking" } });
  record("mutations", "booking-create", booking.status === 201 && booking.data?.id, { httpStatus: booking.status, id: booking.data?.id, status: booking.data?.status, message: booking.data?.message });
  if (booking.data?.id) {
    const cancellation = await lab.call(`/client-portal/bookings/${booking.data.id}/cancel`, { method: "PUT", token: corporate.token, body: { reason: "QA cleanup" } });
    record("mutations", "booking-cancel", cancellation.status === 200, { httpStatus: cancellation.status });
  }
  const deniedBooking = await lab.call(`/client-portal/projects/${projectA}/bookings`, { method: "POST", token: tenantB.token, body: { activityType: "visite", requestedLocalDateTime: future, duration: 60 } });
  record("denials", "cross-tenant-booking", [403, 404].includes(deniedBooking.status), { httpStatus: deniedBooking.status });

  const employeesBefore = await get(`/client-portal/buildings/${buildingA}/sentinelle/employees`, corporate.token);
  const email = `qa-${randomUUID().slice(0, 8)}@global-e2e.test`;
  const employeeWithEmail = await lab.call(`/client-portal/buildings/${buildingA}/sentinelle/employees`, { method: "POST", token: corporate.token, body: { firstName: "QA", lastName: "EmailFailure", email, poste: "Test", smsConsent: false } });
  const employeesAfter = await get(`/client-portal/buildings/${buildingA}/sentinelle/employees`, corporate.token);
  const partialEmployee = Array.isArray(employeesAfter.data) && employeesAfter.data.find(item => item.email === email);
  record("mutations", "employee-email-provider-failure", employeeWithEmail.status >= 500 && !partialEmployee, { httpStatus: employeeWithEmail.status, persistedDespiteFailure: Boolean(partialEmployee) });
  if (partialEmployee) evidence.defects.push({ id: "PORTAL-SENTINELLE-EMAIL-PARTIAL-WRITE", severity: "BLOCKING", observed: "Employee persisted although Brevo call failed in deny-by-default QA network", employeeCountBefore: employeesBefore.data?.length, employeeCountAfter: employeesAfter.data?.length });

  const localEmployee = await lab.call(`/client-portal/buildings/${buildingA}/sentinelle/employees`, { method: "POST", token: manager.token, body: { firstName: "QA", lastName: "LocalOnly", poste: "Test", smsConsent: false } });
  record("mutations", "employee-local-create", localEmployee.status === 201 && localEmployee.data?.id, { httpStatus: localEmployee.status, id: localEmployee.data?.id });
  if (localEmployee.data?.id) {
    const update = await lab.call(`/client-portal/buildings/${buildingA}/sentinelle/employees/${localEmployee.data.id}`, { method: "PUT", token: manager.token, body: { poste: "Updated" } });
    const removal = await lab.call(`/client-portal/buildings/${buildingA}/sentinelle/employees/${localEmployee.data.id}`, { method: "DELETE", token: manager.token });
    record("mutations", "employee-update-delete", update.status === 200 && removal.status === 200, { updateStatus: update.status, deleteStatus: removal.status });
  }

  const inviteEmail = `visitor-${randomUUID().slice(0, 8)}@global-e2e.test`;
  const invitationsBefore = await get(`/client-portal/buildings/${buildingA}/sentinelle/invitations`, corporate.token);
  const invitation = await lab.call(`/client-portal/buildings/${buildingA}/sentinelle/invitations`, { method: "POST", token: corporate.token, body: { firstName: "QA", lastName: "Visitor", email: inviteEmail, visitDate: new Date(Date.now() + 86_400_000).toISOString(), company: "Synthetic", reason: "QA", hostName: "Host" } });
  const invitationsAfter = await get(`/client-portal/buildings/${buildingA}/sentinelle/invitations`, corporate.token);
  const partialInvitation = Array.isArray(invitationsAfter.data) && invitationsAfter.data.find(item => item.email === inviteEmail);
  record("mutations", "invitation-provider-failure", invitation.status >= 500 && !partialInvitation, { httpStatus: invitation.status, persistedDespiteFailure: Boolean(partialInvitation) });
  if (partialInvitation) evidence.defects.push({ id: "PORTAL-SENTINELLE-INVITATION-PARTIAL-WRITE", severity: "BLOCKING", observed: "Invitation persisted although Brevo call failed in deny-by-default QA network", invitationCountBefore: invitationsBefore.data?.length, invitationCountAfter: invitationsAfter.data?.length });

  evidence.completedAt = new Date().toISOString();
  evidence.pass = [...evidence.reads, ...evidence.denials, ...evidence.mutations].every(item => item.status === "PASS");
  await writeFile(join(runtime.evidenceDirectory, "portal-functional-inventory.json"), JSON.stringify(evidence, null, 2));
  console.log(`PORTAL_FUNCTIONAL_INVENTORY_${evidence.pass ? "PASS" : "FAIL"}: defects=${evidence.defects.length}`);
  if (!evidence.pass) process.exitCode = 1;
} finally {
  await Promise.all(["clientCorporateA", "clientLocalA", "clientWithoutBuildings", "clientOrganizationB"].map(key => lab.logout(key).catch(() => undefined)));
  await adapter.close();
}
