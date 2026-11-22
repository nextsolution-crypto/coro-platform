"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const { run, FAMILIES } = require("./coro-demo-families.cjs");

function fakePrisma() {
  const state = { grants: [], revisions: [], fixtures: [], audits: [] };
  const tx = {
    $executeRawUnsafe: async () => {},
    $queryRawUnsafe: async () => [{ family: "SENTINELLE", clients: 2 }],
    client: { findMany: async () => [{ id: "client-demo" }] },
    commercialCapability: { findMany: async () => FAMILIES.map((code) => ({ id: `cap-${code}`, code })) },
    user: { findFirst: async () => ({ id: "admin", role: "SUPER_ADMIN" }) },
    organization: { count: async () => 3 },
    capabilityEntitlement: {
      findFirst: async ({ where }) => {
        const g = state.grants.find((x) => x.capabilityId === where.capabilityId);
        return g ? { ...g, revisions: state.revisions.filter((r) => r.entitlementId === g.id).sort((a, b) => b.versionNumber - a.versionNumber) } : null;
      },
      findUnique: async ({ where }) => {
        const g = state.grants.find((x) => x.id === where.id);
        return g ? { ...g, revisions: state.revisions.filter((r) => r.entitlementId === g.id).sort((a, b) => b.versionNumber - a.versionNumber) } : null;
      },
      create: async ({ data }) => {
        const id = `grant-${state.grants.length}`;
        state.grants.push({ id, capabilityId: data.capabilityId, source: data.source });
        state.revisions.push({ entitlementId: id, ...data.revisions.create });
        return { id };
      },
    },
    capabilityEntitlementRevision: { create: async ({ data }) => state.revisions.push(data) },
    demoFixtureRecord: {
      findUnique: async ({ where }) => state.fixtures.find((f) => f.fixtureKey === where.organizationId_fixtureNamespace_fixtureKey.fixtureKey) ?? null,
      create: async ({ data }) => state.fixtures.push(data),
      update: async () => ({}),
    },
    adminAuditEvent: { create: async ({ data }) => state.audits.push(data) },
  };
  return { state, prisma: { $transaction: (fn) => fn(tx) } };
}

test("provision accorde les trois familles au client de démo, puis verify passe", async () => {
  const { prisma, state } = fakePrisma();
  const out = await run(prisma, "provision", "1");
  assert.equal(out.created, 3);
  assert.equal(state.grants.every((g) => g.source === "TRIAL"), true);
  assert.equal(state.audits[0].action, "CORO_DEMO_FAMILIES_PROVISIONED");
  assert.equal((await run(prisma, "verify")).execution, "PASS");
  assert.equal((await run(prisma, "provision", "2")).created, 0, "idempotent");
});

test("rollback révoque ce qui a été accordé", async () => {
  const { prisma, state } = fakePrisma();
  await run(prisma, "provision", "1");
  const out = await run(prisma, "rollback", "2");
  assert.equal(out.revoked, 3);
  assert.equal(state.revisions.filter((r) => r.lifecycle === "REVOKED").length, 3);
});

test("preflight n'expose aucun identifiant en clair", async () => {
  const { prisma } = fakePrisma();
  const out = await run(prisma, "preflight");
  assert.doesNotMatch(JSON.stringify(out), /client-demo|@/);
  assert.deepEqual(out.inventory.activeClientsLast90Days, { SENTINELLE: 2 });
});

test("le script n'écrit que dans l'organisation de démo", () => {
  const source = fs.readFileSync(require.resolve("./coro-demo-families.cjs"), "utf8");
  assert.match(source, /organizationId: ORGANIZATION_ID, capabilityId: capability.id, scope: "CLIENT"/);
});
