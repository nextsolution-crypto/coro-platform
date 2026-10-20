#!/usr/bin/env node
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { QaIdentityLab } from "./browser-orchestration.mjs";
import { actor } from "./identity-catalogue.mjs";
import { loadSecretStore } from "./secret-store.mjs";
import { startMfaCaptureAdapter } from "./mfa-capture-adapter.mjs";
import { assertUnderQaRoot } from "./policy.mjs";

const output = assertUnderQaRoot(process.env.CORO_QA_IDENTITY_EVIDENCE || "D:\\CORO-QA\\tracking\\qa-identity-lab\\acceptance.json");
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
const report = { executedAt: new Date().toISOString(), checks: [] };
const check = (id, pass, detail) => report.checks.push({ id, status: pass ? "PASS" : "FAIL", detail });

try {
  const wrongPassword = await lab.call("/auth/login", {
    method: "POST",
    body: { email: actor("founder").email, password: `${secrets.syntheticPassword}-wrong` },
  });
  check("wrong-password", wrongPassword.status === 401, `HTTP ${wrongPassword.status}`);

  for (const key of ["founder", "delegatedEmployee", "advisor", "clientCorporateA", "clientRegionalA", "clientLocalA", "clientWithoutBuildings", "clientOrganizationB"]) {
    const session = await lab.loginAs(key);
    check(`login-${key}`, Boolean(session.token), `${session.actor.role}/${session.actor.scope}`);
  }

  const revoked = await lab.loginAs("revokedUser");
  check("revoked-user", revoked.denied && revoked.status >= 400, `HTTP ${revoked.status}`);

  const require = createRequire(join(resolve("coro-backend"), "package.json"));
  const puppeteer = require("puppeteer");
  const browser = await puppeteer.launch({ headless: true });
  try {
    const corporate = await lab.createIsolatedSession("clientCorporateA", { browser });
    const otherTenant = await lab.createIsolatedSession("clientOrganizationB", { browser });
    const [corporateEmail, otherEmail] = await Promise.all([
      corporate.page.evaluate(() => JSON.parse(localStorage.getItem("coro_client_user")).email),
      otherTenant.page.evaluate(() => JSON.parse(localStorage.getItem("coro_client_user")).email),
    ]);
    check("browser-session-isolation", corporateEmail !== otherEmail, "distinct incognito contexts and actors");
  } finally {
    await browser.close();
  }

  const deniedCrossTenant = await lab.assertUnauthorized("clientOrganizationB", "/client-portal/buildings/30000000-0000-4000-8000-000000000001");
  check("cross-tenant-denial", [401, 403, 404].includes(deniedCrossTenant), `HTTP ${deniedCrossTenant}`);
} finally {
  await adapter.close();
}

report.pass = report.checks.every((item) => item.status === "PASS");
await mkdir(resolve(output, ".."), { recursive: true });
await writeFile(output, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ pass: report.pass, evidence: output, checks: report.checks }, null, 2));
if (!report.pass) process.exitCode = 1;
