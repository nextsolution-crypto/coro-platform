"use strict";

/**
 * Droits de contrat des familles Sentinelle, Population et Incident (M11-01).
 * - preflight : état de la démo + inventaire agrégé des autres organisations
 *   (nombre de clients qui utilisent chaque famille sans droit), sans nom.
 * - provision : accorde les trois familles au client de démo (niveau client,
 *   source TRIAL, 365 jours), enregistrées comme fixtures réversibles.
 * - verify / rollback.
 */
const crypto = require("node:crypto");
const MODES = new Set(["preflight", "provision", "verify", "rollback"]);
const ORGANIZATION_ID = "916f54ec-af22-45e0-99db-a369d9630002";
const FIXTURE_NAMESPACE = "coro-demo-families";
const CLIENT_NAME = "Groupe Immobilier Prémont";
const FAMILIES = ["SENTINELLE", "SENTINELLE_POPULATION", "INCIDENT"];
const DURATION_DAYS = 365;
const REASON = "CORO demo — droits de contrat des familles (M11-01)";

const fingerprint = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");
const fixtureWhere = (key) => ({
  organizationId_fixtureNamespace_fixtureKey: {
    organizationId: ORGANIZATION_ID,
    fixtureNamespace: FIXTURE_NAMESPACE,
    fixtureKey: key,
  },
});

async function resolveTarget(tx) {
  const clients = await tx.client.findMany({
    where: { organizationId: ORGANIZATION_ID, name: CLIENT_NAME },
    select: { id: true },
  });
  if (clients.length !== 1) throw new Error("DEMO_CLIENT_NOT_UNIQUE");
  const capabilities = await tx.commercialCapability.findMany({
    where: { code: { in: FAMILIES } },
    select: { id: true, code: true },
  });
  if (capabilities.length !== FAMILIES.length) throw new Error("FAMILY_CAPABILITY_MISSING");
  const actor = await tx.user.findFirst({
    where: { role: "SUPER_ADMIN", isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, role: true },
  });
  if (!actor) throw new Error("GOVERNED_ACTOR_MISSING");
  return { client: clients[0], capabilities, actor };
}

async function familyState(tx, target) {
  const out = {};
  for (const capability of target.capabilities) {
    const grant = await tx.capabilityEntitlement.findFirst({
      where: {
        organizationId: ORGANIZATION_ID,
        capabilityId: capability.id,
        scope: "CLIENT",
        clientId: target.client.id,
        buildingId: null,
      },
      include: { revisions: { orderBy: { versionNumber: "desc" }, take: 1 } },
    });
    const latest = grant?.revisions?.[0];
    out[capability.code] = grant
      ? {
          fingerprint: fingerprint(grant.id),
          source: grant.source,
          lifecycle: latest?.lifecycle ?? null,
          enabled: latest?.enabled ?? null,
          effectiveUntil: latest?.effectiveUntil ?? null,
          owned: Boolean(await tx.demoFixtureRecord.findUnique({ where: fixtureWhere(capability.code) })),
        }
      : null;
  }
  return out;
}

/** Inventaire agrégé hors démo : usage réel de chaque famille, sans identifiant. */
async function inventory(tx) {
  const rows = await tx.$queryRawUnsafe(`
    WITH usage AS (
      SELECT b."organizationId" AS org, b."clientId" AS client, 'SENTINELLE' AS family
        FROM "OccupancyRecord" o JOIN "Building" b ON b.id = o."buildingId"
       WHERE o."checkedInAt" > now() - interval '90 days'
      UNION
      SELECT i."organizationId", b."clientId", 'INCIDENT'
        FROM "IncidentEvent" i JOIN "Building" b ON b.id = i."buildingId"
       WHERE i."createdAt" > now() - interval '90 days'
    )
    SELECT family, COUNT(DISTINCT (org, client))::int AS clients
      FROM usage WHERE org <> '${ORGANIZATION_ID}' GROUP BY family`);
  const organizations = await tx.organization.count({ where: { id: { not: ORGANIZATION_ID } } });
  return {
    otherOrganizations: organizations,
    activeClientsLast90Days: Object.fromEntries(rows.map((r) => [r.family, r.clients])),
  };
}

async function run(prisma, mode, runId) {
  if (!MODES.has(mode)) throw new Error("MODE_INVALID");
  const now = new Date();
  if (mode === "preflight" || mode === "verify") {
    return prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      const target = await resolveTarget(tx);
      const families = await familyState(tx, target);
      if (mode === "verify") {
        for (const code of FAMILIES) {
          const f = families[code];
          if (!f || f.lifecycle !== "GRANTED" || f.enabled !== true || !f.effectiveUntil || new Date(f.effectiveUntil) <= now)
            throw new Error("FAMILY_POSTCONDITION_FAILED");
        }
      }
      return {
        schemaVersion: 1, execution: "PASS", mode, mutation: false,
        clientFingerprint: fingerprint(target.client.id), families,
        ...(mode === "preflight" ? { inventory: await inventory(tx) } : {}),
      };
    }, { timeout: 60_000 });
  }
  return prisma.$transaction(async (tx) => {
    const target = await resolveTarget(tx);
    let created = 0, revoked = 0;
    for (const capability of target.capabilities) {
      const record = await tx.demoFixtureRecord.findUnique({ where: fixtureWhere(capability.code) });
      if (mode === "provision") {
        const existing = await tx.capabilityEntitlement.findFirst({
          where: { organizationId: ORGANIZATION_ID, capabilityId: capability.id, scope: "CLIENT", clientId: target.client.id, buildingId: null },
          include: { revisions: { orderBy: { versionNumber: "desc" }, take: 1 } },
        });
        if (existing && !record) {
          if (existing.revisions[0]?.lifecycle === "GRANTED" && existing.revisions[0]?.enabled) continue; // droit déjà présent, non géré ici
          throw new Error("PREEXISTING_ENTITLEMENT_NOT_OWNED");
        }
        const until = new Date(now.getTime() + DURATION_DAYS * 86400000);
        if (existing) {
          const latest = existing.revisions[0];
          if (latest?.lifecycle === "GRANTED" && latest.enabled) continue;
          await tx.capabilityEntitlementRevision.create({ data: {
            entitlementId: existing.id, versionNumber: (latest?.versionNumber ?? 0) + 1, lifecycle: "GRANTED", enabled: true,
            distributable: false, decisionAt: now, effectiveFrom: now, effectiveUntil: until, reason: REASON,
            createdByUserId: target.actor.id, createdByDisplayName: "CORO governed demo activation" } });
          created += 1;
          continue;
        }
        const grant = await tx.capabilityEntitlement.create({ data: {
          organizationId: ORGANIZATION_ID, capabilityId: capability.id, scope: "CLIENT", clientId: target.client.id,
          source: "TRIAL", provenanceReason: REASON, createdByUserId: target.actor.id,
          createdByDisplayName: "CORO governed demo activation",
          revisions: { create: { versionNumber: 1, lifecycle: "GRANTED", enabled: true, distributable: false, decisionAt: now,
            effectiveFrom: now, effectiveUntil: until, reason: REASON, createdByUserId: target.actor.id,
            createdByDisplayName: "CORO governed demo activation" } } } });
        await tx.demoFixtureRecord.create({ data: { organizationId: ORGANIZATION_ID, fixtureNamespace: FIXTURE_NAMESPACE,
          fixtureKey: capability.code, entityType: "CAPABILITY_ENTITLEMENT", entityId: grant.id } });
        created += 1;
      } else if (record) {
        const grant = await tx.capabilityEntitlement.findUnique({ where: { id: record.entityId },
          include: { revisions: { orderBy: { versionNumber: "desc" }, take: 1 } } });
        const latest = grant?.revisions?.[0];
        if (grant && latest?.lifecycle !== "REVOKED") {
          await tx.capabilityEntitlementRevision.create({ data: {
            entitlementId: grant.id, versionNumber: latest.versionNumber + 1, lifecycle: "REVOKED", enabled: false,
            distributable: false, decisionAt: now, effectiveFrom: now, effectiveUntil: null, reason: `${REASON} — retour arrière`,
            createdByUserId: target.actor.id, createdByDisplayName: "CORO governed demo rollback" } });
          revoked += 1;
        }
        await tx.demoFixtureRecord.update({ where: fixtureWhere(capability.code), data: { state: "RETIRED" } });
      }
    }
    await tx.adminAuditEvent.create({ data: {
      actorType: "INTERNAL_USER", actorUserId: target.actor.id, actorDisplayName: "CORO governed demo activation",
      actorRole: target.actor.role, action: mode === "provision" ? "CORO_DEMO_FAMILIES_PROVISIONED" : "CORO_DEMO_FAMILIES_ROLLED_BACK",
      targetType: "Organization", targetId: ORGANIZATION_ID, organizationId: ORGANIZATION_ID,
      reason: "Autorisation explicite du propriétaire (M11-01)", requestId: String(runId ?? ""),
      afterData: { families: FAMILIES, created, revoked, durationDays: DURATION_DAYS } } });
    return { schemaVersion: 1, execution: "PASS", mode, mutation: true, created, revoked,
      families: await familyState(tx, target) };
  }, { timeout: 60_000 });
}

async function main() {
  if (process.env.CORO_DEMO_FAMILIES_RUN !== "true") throw new Error("RUN_FLAG_MISSING");
  const { PrismaClient } = require("/app/node_modules/@prisma/client");
  const prisma = new PrismaClient();
  try {
    process.stdout.write(`${JSON.stringify(await run(prisma, process.argv[2], process.env.GITHUB_RUN_ID))}\n`);
  } catch (error) {
    const candidate = error instanceof Error ? error.message : "";
    const errorCode = /^[A-Z][A-Z0-9_]{2,100}$/.test(candidate) ? candidate : "INTERNAL_ERROR";
    process.stdout.write(`${JSON.stringify({ schemaVersion: 1, execution: "FAIL", mode: process.argv[2], errorCode })}\n`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { FAMILIES, run, fingerprint };
if (require.main === module) main().catch(() => { process.exitCode = 1; });
