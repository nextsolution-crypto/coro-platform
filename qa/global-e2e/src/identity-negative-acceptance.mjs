#!/usr/bin/env node
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { QaIdentityLab } from "./browser-orchestration.mjs";
import { actor } from "./identity-catalogue.mjs";
import { loadSecretStore } from "./secret-store.mjs";
import { startMfaCaptureAdapter } from "./mfa-capture-adapter.mjs";
import { assertUnderQaRoot } from "./policy.mjs";

const output = assertUnderQaRoot(process.env.CORO_QA_IDENTITY_NEGATIVE_EVIDENCE || "D:\\CORO-QA\\tracking\\qa-identity-lab\\negative-acceptance.json");
const captureDirectory = assertUnderQaRoot(process.env.CORO_QA_MFA_DIR);
const secrets = await loadSecretStore();
const adapter = await startMfaCaptureAdapter({ captureDirectory, channelToken: secrets.mfaChannelToken });
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
  const founder = actor("founder");
  let startedAt = Date.now();
  const founderLogin = await lab.call("/auth/login", { method: "POST", body: { email: founder.email, password: secrets.syntheticPassword } });
  const founderCode = await lab.completeMfa(founder, startedAt);
  const wrongCode = founderCode === "000000" ? "999999" : "000000";
  const wrongMfa = await lab.call("/auth/verify-mfa", { method: "POST", body: { email: founder.email, code: wrongCode } });
  check("wrong-mfa", wrongMfa.status === 401, `HTTP ${wrongMfa.status}`);

  const delegated = actor("delegatedEmployee");
  startedAt = Date.now();
  const delegatedLogin = await lab.call("/auth/login", { method: "POST", body: { email: delegated.email, password: secrets.syntheticPassword } });
  const delegatedCode = await lab.completeMfa(delegated, startedAt);
  const require = createRequire(join(resolve("coro-backend"), "package.json"));
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const delegatedUser = await prisma.user.findUniqueOrThrow({ where: { email: delegated.email }, select: { id: true } });
    await prisma.platformMfaChallenge.update({ where: { userId: delegatedUser.id }, data: { expiresAt: new Date(Date.now() - 1_000) } });
  } finally { await prisma.$disconnect(); }
  const expiredMfa = await lab.call("/auth/verify-mfa", { method: "POST", body: { email: delegated.email, code: delegatedCode } });
  check("expired-mfa", expiredMfa.status === 401, `HTTP ${expiredMfa.status}`);

  const throttleStatuses = [];
  for (let index = 0; index < 6; index += 1) {
    const attempt = await lab.call("/auth/login", { method: "POST", body: { email: `missing-${index}@global-e2e.test`, password: "invalid" } });
    throttleStatuses.push(attempt.status);
  }
  check("login-throttling", throttleStatuses.includes(429), `statuses ${throttleStatuses.join(",")}`);
  check("mfa-required", founderLogin.data?.mfaRequired === true && delegatedLogin.data?.mfaRequired === true, "both password steps required MFA");
} finally {
  await adapter.close();
  for (const file of await readdir(captureDirectory)) {
    if (file.endsWith(".json")) await rm(join(captureDirectory, file), { force: true });
  }
}

report.pass = report.checks.every((item) => item.status === "PASS");
await mkdir(resolve(output, ".."), { recursive: true });
await writeFile(output, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ pass: report.pass, evidence: output, checks: report.checks }, null, 2));
if (!report.pass) process.exitCode = 1;
