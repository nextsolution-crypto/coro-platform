#!/usr/bin/env node
import { readFile, readdir, stat, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  assertLocalUrl,
  assertUnderQaRoot,
  RUN_ROOT,
  redact,
} from "./policy.mjs";

const api = assertLocalUrl(
  process.env.CORO_QA_BACKEND_URL,
  "CORO_QA_BACKEND_URL",
)
  .toString()
  .replace(/\/$/, "");
const ids = JSON.parse(await readFile(process.env.CORO_QA_ACTOR_FILE, "utf8"));
const mfaDir = process.env.CORO_QA_MFA_DIR;
const password = process.env.CORO_QA_SYNTHETIC_PASSWORD;
if (!mfaDir || !password)
  throw new Error("Synthetic authentication configuration required.");
const results = [];

async function call(method, route, token, body) {
  const response = await fetch(`${api}${route}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: response.status, json, text };
}
async function latestCode(email, after) {
  const entries = await Promise.all(
    (await readdir(mfaDir)).map(async (name) => ({
      name,
      time: (await stat(join(mfaDir, name))).mtimeMs,
    })),
  );
  for (const entry of entries.sort((a, b) => b.time - a.time)) {
    if (entry.time < after - 2000) break;
    const message = JSON.parse(
      await readFile(join(mfaDir, entry.name), "utf8"),
    );
    if (String(message.to).toLowerCase() === email)
      return /\b(\d{6})\b/.exec(message.subject)?.[1];
  }
  throw new Error(`MFA capture missing for ${email}`);
}
async function login(key) {
  const email = `${key}@global-e2e.test`;
  const started = Date.now();
  const first = await call("POST", "/auth/login", null, { email, password });
  if (first.status !== 201 || !first.json?.mfaRequired)
    throw new Error(`Login failed for ${key}: ${first.status}`);
  const verified = await call("POST", "/auth/verify-mfa", null, {
    email,
    code: await latestCode(email, started),
  });
  if (verified.status !== 201 || !verified.json?.access_token)
    throw new Error(`MFA failed for ${key}: ${verified.status}`);
  return verified.json;
}
const expect = (id, actual, allowed) =>
  results.push({
    id,
    status: allowed.includes(actual.status) ? "PASS" : "FAIL",
    httpStatus: actual.status,
  });

const founder = await login("founder");
const employee = await login("employee-none");
const adminA = await login("customer-admin-a");
expect(
  "founder-login-mfa",
  await call("GET", "/admin/v1/platform-authority/me", founder.access_token),
  [200],
);
expect(
  "customer-admin-platform-denial",
  await call("GET", "/admin/v1/platform-authority/grants", adminA.access_token),
  [403],
);
expect(
  "cross-tenant-api-denial",
  await call("GET", `/organizations/${ids.orgB}`, adminA.access_token),
  [403, 404],
);
const grant = await call(
  "POST",
  "/admin/v1/platform-authority/grants",
  founder.access_token,
  {
    userId: ids.employeeNone,
    permission: "ORGANIZATION_360_READ",
    scope: "ORGANIZATION",
    targetOrganizationId: ids.orgA,
    reason: "Global E2E temporary organization grant",
  },
);
expect("grant-create", grant, [201]);
if (grant.json?.id) {
  expect(
    "grant-effective",
    await call("GET", "/admin/v1/platform-authority/me", employee.access_token),
    [200],
  );
  expect(
    "grant-revocation",
    await call(
      "POST",
      `/admin/v1/platform-authority/grants/${grant.json.id}/revoke`,
      founder.access_token,
      {
        lockVersion: grant.json.lockVersion,
        reason: "Global E2E immediate revocation check",
      },
    ),
    [201],
  );
}
const refreshed = await call("POST", "/auth/refresh", null, {
  refresh_token: employee.refresh_token,
});
expect("session-refresh", refreshed, [200, 201]);
if (refreshed.json?.refresh_token)
  expect(
    "logout",
    await call("POST", "/auth/logout", null, {
      refresh_token: refreshed.json.refresh_token,
    }),
    [200, 201],
  );
expect(
  "anonymous-denial",
  await call("GET", "/admin/v1/platform-authority/grants"),
  [401],
);

const output = assertUnderQaRoot(
  join(RUN_ROOT, `api-smoke-${Date.now()}.json`),
);
await mkdir(assertUnderQaRoot(RUN_ROOT), { recursive: true });
await writeFile(
  output,
  JSON.stringify(
    redact({ generatedAt: new Date().toISOString(), results }),
    null,
    2,
  ),
);
console.log(
  `Authenticated API smoke: ${results.filter((x) => x.status === "PASS").length}/${results.length} PASS`,
);
console.log(`Evidence: ${output}`);
if (results.some((x) => x.status === "FAIL")) process.exitCode = 1;
