#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { QaIdentityLab } from "./browser-orchestration.mjs";
import { loadSecretStore } from "./secret-store.mjs";
import { startMfaCaptureAdapter } from "./mfa-capture-adapter.mjs";
import { assertUnderQaRoot } from "./policy.mjs";

const output = assertUnderQaRoot(
  process.env.CORO_QA_SESSION_EVIDENCE ||
    "D:\\CORO-QA\\tracking\\qa-identity-lab\\session-acceptance.json",
);
const captureDirectory = assertUnderQaRoot(process.env.CORO_QA_MFA_DIR);
const secrets = await loadSecretStore();
const adapter = await startMfaCaptureAdapter({
  captureDirectory,
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
const check = (id, pass, detail) =>
  report.checks.push({ id, status: pass ? "PASS" : "FAIL", detail });

try {
  const session = await lab.loginAs("founder");
  const firstRefresh = await lab.call("/auth/refresh", {
    method: "POST",
    body: { refresh_token: session.refresh },
  });
  check(
    "refresh-rotation",
    firstRefresh.status === 201 &&
      Boolean(firstRefresh.data?.access_token) &&
      Boolean(firstRefresh.data?.refresh_token) &&
      firstRefresh.data.refresh_token !== session.refresh,
    `HTTP ${firstRefresh.status}; successor token issued`,
  );

  const replay = await lab.call("/auth/refresh", {
    method: "POST",
    body: { refresh_token: session.refresh },
  });
  check("refresh-replay-denial", replay.status === 401, `HTTP ${replay.status}`);

  const logout = await lab.call("/auth/logout", {
    method: "POST",
    body: { refresh_token: firstRefresh.data?.refresh_token },
  });
  check("logout", logout.status === 201, `HTTP ${logout.status}`);

  const afterLogout = await lab.call("/auth/refresh", {
    method: "POST",
    body: { refresh_token: firstRefresh.data?.refresh_token },
  });
  check("logout-revocation", afterLogout.status === 401, `HTTP ${afterLogout.status}`);
} finally {
  await adapter.close();
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
