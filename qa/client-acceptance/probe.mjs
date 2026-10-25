#!/usr/bin/env node
import { readFile, readdir, stat, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const api = (process.env.CORO_QA_BACKEND_URL || "http://127.0.0.1:3166/api").replace(/\/$/, "");
const password = process.env.CORO_QA_SYNTHETIC_PASSWORD;
const mfaDirectory = process.env.CORO_QA_MFA_DIR;
const output = process.env.CORO_QA_EVIDENCE;
if (!password || !mfaDirectory || !output) throw new Error("QA configuration incomplete");

async function call(route, { token, method = "GET", body } = {}) {
  const response = await fetch(`${api}${route}`, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data = text;
  try { data = JSON.parse(text); } catch {}
  return { status: response.status, data };
}

async function latestCode(email, after) {
  const files = await Promise.all((await readdir(mfaDirectory)).map(async name => ({ name, time: (await stat(join(mfaDirectory, name))).mtimeMs })));
  for (const file of files.sort((a, b) => b.time - a.time)) {
    if (file.time < after - 2000) break;
    const message = JSON.parse(await readFile(join(mfaDirectory, file.name), "utf8"));
    if (String(message.to).toLowerCase() === email) return /\b(\d{6})\b/.exec(message.subject)?.[1];
  }
  throw new Error(`MFA capture missing for ${email}`);
}

async function login(email) {
  const after = Date.now();
  const challenge = await call("/client-auth/login", { method: "POST", body: { email, password } });
  if (challenge.status !== 201 || !challenge.data?.mfaRequired) throw new Error(`Login challenge failed: ${email} ${challenge.status}`);
  const verified = await call("/client-auth/verify-mfa", { method: "POST", body: { email, code: await latestCode(email, after) } });
  if (verified.status !== 201 || !verified.data?.token) throw new Error(`MFA failed: ${email} ${verified.status}`);
  return verified.data.token;
}

const actors = {
  manager: "portal-local-a@global-e2e.test",
  corporate: "portal-corporate-a@global-e2e.test",
  zero: "portal-zero-a@global-e2e.test",
  otherTenant: "portal-corporate-b@global-e2e.test",
};
const ids = {
  buildingA: "40000000-0000-4000-8000-000000000001",
  buildingB: "40000000-0000-4000-8000-000000000002",
  projectA: "50000000-0000-4000-8000-000000000001",
};
const report = { generatedAt: new Date().toISOString(), actors: {}, checks: [] };

for (const [key, email] of Object.entries(actors)) {
  const token = await login(email);
  const [intelligence, buildings, projects, directProject] = await Promise.all([
    call("/client-portal/intelligence/overview", { token }),
    call("/client-portal/buildings", { token }),
    call("/client-portal/projects", { token }),
    call(`/client-portal/projects/${ids.projectA}`, { token }),
  ]);
  report.actors[key] = {
    token,
    intelligence: { status: intelligence.status, totalBuildings: intelligence.data?.totalBuildings, buildingIds: intelligence.data?.buildings?.map(item => item.buildingId), recommendationBuildingIds: intelligence.data?.recommendations?.map(item => item.buildingId) },
    buildings: { status: buildings.status, ids: Array.isArray(buildings.data) ? buildings.data.map(item => item.id) : [] },
    projects: { status: projects.status, ids: Array.isArray(projects.data) ? projects.data.map(item => item.id) : [] },
    directProject: { status: directProject.status, id: directProject.data?.id, state: directProject.data?.status, hasOfficialFr: Boolean(directProject.data?.officialPdfFrUrl), hasOfficialEn: Boolean(directProject.data?.officialPdfEnUrl) },
  };
}

const m = report.actors.manager;
const c = report.actors.corporate;
const z = report.actors.zero;
const o = report.actors.otherTenant;
const add = (id, pass, observed) => report.checks.push({ id, status: pass ? "PASS" : "FAIL", observed });
add("CP004-manager-scope", m.intelligence.status === 200 && JSON.stringify(m.intelligence.buildingIds) === JSON.stringify([ids.buildingA]), m.intelligence);
add("CP004-corporate-scope", c.intelligence.status === 200 && c.intelligence.buildingIds?.includes(ids.buildingA) && c.intelligence.buildingIds?.includes(ids.buildingB), c.intelligence);
add("CP004-zero-scope", z.intelligence.status === 200 && z.intelligence.totalBuildings === 0, z.intelligence);
add("CP004-other-tenant", o.intelligence.status === 200 && !o.intelligence.buildingIds?.includes(ids.buildingA) && !o.intelligence.buildingIds?.includes(ids.buildingB), o.intelligence);
add("CORE-manager-list-direct", m.projects.ids?.includes(ids.projectA) && m.directProject.status === 200, { projects: m.projects, direct: m.directProject });
add("CORE-corporate-list-direct", c.projects.ids?.includes(ids.projectA) && c.directProject.status === 200, { projects: c.projects, direct: c.directProject });
add("CORE-zero-denial", !z.projects.ids?.includes(ids.projectA) && z.directProject.status === 200 && !z.directProject.id, { projects: z.projects, direct: z.directProject });
add("CORE-cross-tenant-denial", !o.projects.ids?.includes(ids.projectA) && o.directProject.status === 200 && !o.directProject.id, { projects: o.projects, direct: o.directProject });

for (const value of Object.values(report.actors)) delete value.token;
report.pass = report.checks.every(item => item.status === "PASS");
await mkdir(output, { recursive: true });
await writeFile(join(output, "api-scope-probe.json"), JSON.stringify(report, null, 2));
console.log(`CLIENT_ACCEPTANCE_API_${report.pass ? "PASS" : "FAIL"}: ${report.checks.filter(item => item.status === "PASS").length}/${report.checks.length}`);
if (!report.pass) process.exitCode = 1;
