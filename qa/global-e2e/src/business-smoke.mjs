#!/usr/bin/env node
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  assertLocalUrl,
  assertUnderQaRoot,
  redact,
  RUN_ROOT,
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
const evidence = {
  generatedAt: new Date().toISOString(),
  booking: [],
  financial: [],
};

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
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: response.status, json };
}
function record(domain, id, response, allowed) {
  const pass = allowed.includes(response.status);
  evidence[domain].push({
    id,
    status: pass ? "PASS" : "FAIL",
    httpStatus: response.status,
  });
  if (!pass)
    throw new Error(
      `${domain}/${id}: HTTP ${response.status}; expected ${allowed.join("/")}; ${JSON.stringify(response.json)}`,
    );
  return response.json;
}
async function latestCode(email, after) {
  const entries = await Promise.all(
    (await readdir(mfaDir)).map(async (name) => ({
      name,
      time: (await stat(join(mfaDir, name))).mtimeMs,
    })),
  );
  for (const entry of entries.sort((a, b) => b.time - a.time)) {
    if (entry.time < after - 2_000) break;
    const message = JSON.parse(
      await readFile(join(mfaDir, entry.name), "utf8"),
    );
    if (String(message.to).toLowerCase() === email)
      return /\b(\d{6})\b/.exec(message.subject)?.[1];
  }
  throw new Error(`MFA capture missing for ${email}`);
}
async function login(key, portal = false) {
  const email = `${key}@global-e2e.test`;
  const base = portal ? "/client-auth" : "/auth";
  const started = Date.now();
  const first = await call("POST", `${base}/login`, null, { email, password });
  if (![200, 201].includes(first.status) || !first.json?.mfaRequired)
    throw new Error(`Login failed for ${key}: ${first.status}`);
  const verified = await call("POST", `${base}/verify-mfa`, null, {
    email,
    code: await latestCode(email, started),
  });
  const token = verified.json?.access_token ?? verified.json?.token;
  if (![200, 201].includes(verified.status) || !token)
    throw new Error(`MFA failed for ${key}: ${verified.status}`);
  return token;
}

const founder = await login("founder");
const employee = await login("employee-org");
const adminA = await login("customer-admin-a");
const adminB = await login("customer-admin-b");
const advisor = await login("advisor-a");
const portal = await login("portal-manager-a", true);

record(
  "booking",
  "advisor-schedule",
  await call("POST", `/work-schedules/users/${ids.advisorA}`, adminA, {
    effectiveFrom: "2026-01-01",
    timeZone: "America/Toronto",
    intervals: Array.from({ length: 7 }, (_, dayOfWeek) => ({
      dayOfWeek,
      startTime: 480,
      endTime: 1080,
    })),
  }),
  [201],
);
record(
  "booking",
  "eligibility-grant",
  await call(
    "POST",
    `/bookings/projects/${ids.projectA}/advisor-eligibilities`,
    adminA,
    {
      advisorUserId: ids.advisorA,
      priority: 1,
    },
  ),
  [201],
);
const booking = record(
  "booking",
  "client-request",
  await call(
    "POST",
    `/client-portal/projects/${ids.projectA}/bookings`,
    portal,
    {
      activityType: "revision",
      requestedDate: "2027-01-15T15:00:00-05:00",
      duration: 60,
      participants: 4,
      comment: "Synthetic governed booking smoke",
    },
  ),
  [201],
);
record(
  "booking",
  "cross-tenant-assignment-denial",
  await call("GET", `/bookings/${booking.id}/assignments`, adminB),
  [403, 404],
);
const advisorView = record(
  "booking",
  "advisor-visibility",
  await call("GET", "/planning/my-assignments", advisor),
  [200],
);
const projected = advisorView?.items?.find(
  (item) => item.bookingId === booking.id,
);
if (!projected) throw new Error("Governed advisor assignment is missing.");
const assignment = { id: projected.assignmentId };
const commitment = projected?.commitmentVersion;
record(
  "booking",
  "advisor-governed-decline",
  await call(
    "POST",
    `/bookings/${booking.id}/assignments/${assignment.id}/respond`,
    advisor,
    {
      status: "DECLINED",
      declineReason: "Synthetic governed decline",
      ...(commitment
        ? {
            commitmentVersionId: commitment.id,
            expectedFingerprint: commitment.expectedFingerprint,
          }
        : {}),
    },
  ),
  [201],
);
record(
  "booking",
  "other-actor-response-denial",
  await call(
    "POST",
    `/bookings/${booking.id}/assignments/${assignment.id}/respond`,
    adminA,
    { status: "ACCEPTED" },
  ),
  [403],
);
record(
  "booking",
  "client-cancel",
  await call("PUT", `/client-portal/bookings/${booking.id}/cancel`, portal, {
    reason: "Synthetic cleanup cancellation",
  }),
  [200],
);
const persisted = record(
  "booking",
  "persistence-reload",
  await call("GET", `/bookings/project/${ids.projectA}`, adminA),
  [200],
);
if (
  !Array.isArray(persisted) ||
  !persisted.some((item) => item.id === booking.id)
)
  throw new Error("Cancelled booking did not persist.");

async function grant(permission) {
  return record(
    "financial",
    `grant-${permission.toLowerCase()}`,
    await call("POST", "/admin/v1/platform-authority/grants", founder, {
      userId: ids.employeeOrg,
      permission,
      scope: "ORGANIZATION",
      targetOrganizationId: ids.orgA,
      reason: `Global E2E temporary ${permission} grant`,
    }),
    [201],
  );
}
for (const permission of [
  "FINANCIAL_ADVISOR_COST_MANAGE",
  "FINANCIAL_RENDEMENT_READ",
  "FINANCIAL_SALE_VALIDATE",
])
  await grant(permission);
const rate = record(
  "financial",
  "cost-rate-draft",
  await call("POST", "/advisor-cost-rates", founder, {
    organizationId: ids.orgA,
    userId: ids.advisorA,
    currency: "CAD",
    hourlyCost: "100.00",
    effectiveFrom: "2026-01-01",
  }),
  [201],
);
const proposed = record(
  "financial",
  "cost-rate-submit",
  await call("POST", `/advisor-cost-rates/${rate.id}/submit`, founder, {
    lockVersion: rate.lockVersion,
    reason: "Synthetic governed cost proposal",
  }),
  [201],
);
record(
  "financial",
  "four-eyes-self-approval-denial",
  await call("POST", `/advisor-cost-rates/${rate.id}/approve`, founder, {
    lockVersion: proposed.lockVersion,
    reason: "Must be denied",
  }),
  [403],
);
record(
  "financial",
  "delegated-cost-rate-approval",
  await call("POST", `/advisor-cost-rates/${rate.id}/approve`, employee, {
    lockVersion: proposed.lockVersion,
    reason: "Synthetic independent approval",
  }),
  [201],
);
const task = record(
  "financial",
  "advisor-task",
  await call("POST", `/projects/${ids.projectA}/tasks`, advisor, {
    taskTitle: "Synthetic billable work",
    categoryName: "QA",
    assigneeId: ids.advisorA,
  }),
  [201],
);
record(
  "financial",
  "advisor-timelog",
  await call(
    "POST",
    `/projects/${ids.projectA}/tasks/${task.id}/time`,
    advisor,
    {
      date: "2026-10-15",
      heures: "5",
      note: "Synthetic financial smoke",
    },
  ),
  [201],
);
record(
  "financial",
  "cad-only-denial",
  await call(
    "PUT",
    `/rendement/financial/mandates/${ids.mandateA}/sale`,
    founder,
    {
      soldAmount: "300.00",
      soldCurrency: "USD",
      soldAt: "2026-10-15",
      reason: "Must reject non-CAD",
      lockVersion: 0,
    },
  ),
  [400],
);
record(
  "financial",
  "governed-cad-sale",
  await call(
    "PUT",
    `/rendement/financial/mandates/${ids.mandateA}/sale`,
    founder,
    {
      soldAmount: "300.00",
      soldCurrency: "CAD",
      soldAt: "2026-10-15",
      reason: "Synthetic governed sale",
      lockVersion: 0,
    },
  ),
  [200],
);
const financial = record(
  "financial",
  "founder-financial-view",
  await call("GET", `/rendement/financial?organizationId=${ids.orgA}`, founder),
  [200],
);
const mandate = financial.mandates?.find(
  (item) => item.id === ids.mandateA || item.mandateId === ids.mandateA,
);
if (
  !mandate ||
  mandate.soldAmount !== "300.00" ||
  mandate.knownLaborCost !== "500.00" ||
  mandate.contributionMargin !== "-200.00"
)
  throw new Error("Canonical negative margin was not preserved.");
record(
  "financial",
  "delegated-financial-view",
  await call(
    "GET",
    `/rendement/financial?organizationId=${ids.orgA}`,
    employee,
  ),
  [200],
);
record(
  "financial",
  "delegated-cross-tenant-denial",
  await call(
    "GET",
    `/rendement/financial?organizationId=${ids.orgB}`,
    employee,
  ),
  [403],
);
record(
  "financial",
  "customer-admin-financial-denial",
  await call("GET", `/rendement/financial?organizationId=${ids.orgA}`, adminA),
  [403],
);

const output = assertUnderQaRoot(
  join(RUN_ROOT, `business-smoke-${Date.now()}.json`),
);
await mkdir(assertUnderQaRoot(RUN_ROOT), { recursive: true });
await writeFile(output, JSON.stringify(redact(evidence), null, 2));
console.log(
  `Business smoke PASS: Booking ${evidence.booking.length}; Financial ${evidence.financial.length}`,
);
console.log(`Evidence: ${output}`);
