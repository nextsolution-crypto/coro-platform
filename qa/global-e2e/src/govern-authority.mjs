#!/usr/bin/env node
import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { assertLocalUrl } from "./policy.mjs";

const api = assertLocalUrl(
  process.env.CORO_QA_BACKEND_URL,
  "CORO_QA_BACKEND_URL",
)
  .toString()
  .replace(/\/$/, "");
const actorFile = JSON.parse(
  await readFile(process.env.CORO_QA_ACTOR_FILE, "utf8"),
);
const mfaDir = process.env.CORO_QA_MFA_DIR;
const password = process.env.CORO_QA_SYNTHETIC_PASSWORD;
if (!mfaDir || !password)
  throw new Error("MFA directory and synthetic password are required.");

async function request(route, body, token) {
  const response = await fetch(`${api}${route}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  if (!response.ok)
    throw new Error(`${route} failed with HTTP ${response.status}`);
  return json;
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
  throw new Error("Synthetic MFA capture missing.");
}
const email = "founder@global-e2e.test";
const started = Date.now();
const login = await request("/auth/login", { email, password });
if (!login.mfaRequired) throw new Error("Real MFA challenge was not required.");
const verified = await request("/auth/verify-mfa", {
  email,
  code: await latestCode(email, started),
});
const token = verified.access_token;
const draft = await request(
  "/admin/v1/platform-authority/draft",
  {
    operatorOrganizationId: actorFile.operator,
    founderUserId: actorFile.founder,
    reason: "Governed global E2E QA initialization",
  },
  token,
);
if (draft.status !== "DRAFT" || draft.lockVersion !== 0)
  throw new Error("Unexpected DRAFT authority state.");
const active = await request(
  "/admin/v1/platform-authority/activate",
  {
    lockVersion: draft.lockVersion,
    reason: "Governed global E2E QA activation",
  },
  token,
);
if (active.status !== "ACTIVE" || active.lockVersion !== 1)
  throw new Error("Unexpected ACTIVE authority state.");
console.log("Governed Platform Authority lifecycle: PASS");
