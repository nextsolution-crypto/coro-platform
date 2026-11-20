"use strict";

const crypto = require("node:crypto");
const MODES = new Set(["preflight", "extend", "verify", "rollback"]);
const ORGANIZATION_ID = "916f54ec-af22-45e0-99db-a369d9630002";
const FIXTURE_NAMESPACE = "coro-demo-report-20-templates";
const BUILDING_FINGERPRINT =
  "5ba4072e9e0027d5b74ff469e5424463f671eb76b9c052db8f024b2450b0f3ec";
const HISTORICAL_TEMPLATE_KEY = "coro-demo-property-incident-v1";
const TARGET = {
  clientName: "Groupe Immobilier Prémont",
  buildingName: "Tour Prémont",
  identities: {
    agent: {
      email: "demo-client@getcoro.io",
      role: "CLIENT_MANAGER",
      permissions: [
        "INCIDENT_REPORT_READ",
        "INCIDENT_REPORT_CREATE",
        "INCIDENT_REPORT_EDIT",
      ],
    },
    supervisor: {
      email: "demo-clientcorp@getcoro.io",
      role: "CLIENT_CORPORATE",
      permissions: [
        "INCIDENT_REPORT_READ",
        "INCIDENT_REPORT_REVIEW",
        "INCIDENT_REPORT_APPROVE",
        "INCIDENT_REPORT_EXPORT",
      ],
    },
  },
};
const fingerprint = (value) =>
  crypto.createHash("sha256").update(String(value)).digest("hex");
const normalize = (value) =>
  String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
const fixtureWhere = (key) => ({
  organizationId_fixtureNamespace_fixtureKey: {
    organizationId: ORGANIZATION_ID,
    fixtureNamespace: FIXTURE_NAMESPACE,
    fixtureKey: key,
  },
});

function assertRuntimeFlags(environment) {
  const required = {
    INCIDENT_REPORTS_ENABLED: true,
    INCIDENT_REPORT_ATTACHMENTS_ENABLED: false,
    INCIDENT_REPORT_IMPORT_ENABLED: false,
    INCIDENT_REPORT_ARCHIVES_ENABLED: false,
    OPERATIONAL_LOG_ENABLED: false,
    OPERATIONAL_SHIFTS_ENABLED: false,
    OPERATIONAL_DIRECTIVES_ENABLED: false,
    OPERATIONAL_FOLLOWUPS_ENABLED: false,
  };
  for (const [name, expected] of Object.entries(required)) {
    if ((environment[name] === "true") !== expected)
      throw new Error(`FLAG_${name}_INVALID`);
  }
}

function fieldCatalog(formSchema) {
  return Object.fromEntries(
    formSchema.sections.flatMap((section) =>
      section.fields.map((field) => [
        field.key,
        {
          label: field.label,
          type: field.type,
          required: field.required === true,
          sectionKey: section.key,
          source: field.source ?? "CORO",
        },
      ]),
    ),
  );
}

function canonicalTemplate(template, validateFormSchema) {
  const formSchema = validateFormSchema(template.formSchema);
  if (formSchema.schemaVersion !== "1.1")
    throw new Error("CATALOG_SCHEMA_VERSION_INVALID");
  const catalog = fieldCatalog(formSchema);
  const canonical = JSON.stringify({
    formSchema,
    fieldCatalog: catalog,
    mappingMetadata: null,
  });
  return {
    ...template,
    formSchema,
    fieldCatalog: catalog,
    contentHash: fingerprint(canonical),
  };
}

function loadCatalog() {
  const modulePath =
    process.env.INCIDENT_REPORT_FORM_ENGINE_MODULE ||
    "/app/dist/src/incident-reports/incident-report-form-engine.js";
  const engine = require(modulePath);
  const source = engine.INITIAL_INCIDENT_REPORT_TEMPLATES;
  if (!Array.isArray(source) || source.length !== 12)
    throw new Error("CATALOG_CARDINALITY_INVALID");
  const catalog = source.map((template) =>
    canonicalTemplate(template, engine.validateFormSchema),
  );
  if (new Set(catalog.map((template) => template.templateKey)).size !== 12)
    throw new Error("CATALOG_IDENTIFIERS_NOT_UNIQUE");
  return catalog;
}

function buildPlan(catalog, existing) {
  return catalog.map((template) => {
    const versions = existing
      .filter((row) => row.templateKey === template.templateKey)
      .sort((a, b) => b.version - a.version);
    const identical = versions.find(
      (row) =>
        row.contentHash === template.contentHash && row.status === "PUBLISHED",
    );
    if (identical)
      return { template, action: "UNCHANGED", existingId: identical.id };
    return {
      template,
      action: versions.length === 0 ? "CREATE" : "NEW_VERSION",
      version: (versions[0]?.version ?? 0) + 1,
      previousId: versions[0]?.id ?? null,
    };
  });
}

async function resolveTarget(tx) {
  const organization = await tx.organization.findUnique({
    where: { id: ORGANIZATION_ID },
    select: {
      id: true,
      name: true,
      isActive: true,
      demoEnvironment: {
        select: {
          status: true,
          communicationMode: true,
          externalProvidersDisabled: true,
        },
      },
    },
  });
  if (
    !organization ||
    normalize(organization.name) !== normalize("CORO Démo") ||
    !organization.isActive ||
    organization.demoEnvironment?.status !== "ACTIVE" ||
    organization.demoEnvironment?.communicationMode !== "SIMULATE" ||
    organization.demoEnvironment?.externalProvidersDisabled !== true
  )
    throw new Error("DEMO_TENANT_NOT_ADMISSIBLE");

  const clients = await tx.client.findMany({
    where: { organizationId: ORGANIZATION_ID, isActive: true },
    select: { id: true, name: true },
  });
  const client = clients.filter(
    (row) => normalize(row.name) === normalize(TARGET.clientName),
  );
  if (client.length !== 1) throw new Error("CLIENT_CARDINALITY_INVALID");
  const buildings = await tx.building.findMany({
    where: {
      organizationId: ORGANIZATION_ID,
      clientId: client[0].id,
      isActive: true,
    },
    select: { id: true, name: true },
  });
  const building = buildings.filter(
    (row) => normalize(row.name) === normalize(TARGET.buildingName),
  );
  if (
    building.length !== 1 ||
    fingerprint(building[0].id) !== BUILDING_FINGERPRINT
  )
    throw new Error("BUILDING_CANONICAL_ID_MISMATCH");

  const identities = {};
  for (const [profile, expected] of Object.entries(TARGET.identities)) {
    const identity = await tx.clientUser.findUnique({
      where: { email: expected.email },
      select: {
        id: true,
        organizationId: true,
        clientId: true,
        role: true,
        isActive: true,
        operationalPermissions: true,
      },
    });
    if (
      !identity ||
      !identity.isActive ||
      identity.organizationId !== ORGANIZATION_ID ||
      identity.clientId !== client[0].id ||
      identity.role !== expected.role ||
      identity.operationalPermissions.length !== expected.permissions.length ||
      !expected.permissions.every((permission) =>
        identity.operationalPermissions.includes(permission),
      )
    )
      throw new Error(`IDENTITY_${profile.toUpperCase()}_NOT_ADMISSIBLE`);
    identities[profile] = identity;
  }
  if (identities.agent.id === identities.supervisor.id)
    throw new Error("IDENTITIES_NOT_DISTINCT");

  const assignmentCount = await tx.clientOperationalBuildingAssignment.count({
    where: {
      organizationId: ORGANIZATION_ID,
      buildingId: building[0].id,
      clientUserId: { in: [identities.agent.id, identities.supervisor.id] },
      status: "ACTIVE",
      effectiveFrom: { lte: new Date() },
      OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: new Date() } }],
    },
  });
  if (assignmentCount !== 2) throw new Error("ASSIGNMENTS_NOT_ADMISSIBLE");
  const authorityCount = await tx.incidentAuthorityAssignment.count({
    where: {
      organizationId: ORGANIZATION_ID,
      buildingId: building[0].id,
      subjectType: "CLIENT_USER",
      subjectId: { in: [identities.agent.id, identities.supervisor.id] },
      status: "ACTIVE",
      permissions: { has: "INCIDENT_READ" },
    },
  });
  if (authorityCount !== 2) throw new Error("AUTHORITIES_NOT_ADMISSIBLE");

  const capability = await tx.commercialCapability.findUnique({
    where: { code: "INCIDENT_REPORTS" },
  });
  if (!capability?.isAvailable || capability.lifecycle !== "CURRENT")
    throw new Error("CAPABILITY_NOT_AVAILABLE");
  const entitlement = await tx.capabilityEntitlement.findFirst({
    where: {
      organizationId: ORGANIZATION_ID,
      capabilityId: capability.id,
      scope: "SITE",
      clientId: client[0].id,
      buildingId: building[0].id,
    },
    include: { revisions: { orderBy: { versionNumber: "desc" }, take: 1 } },
  });
  const entitlementState = entitlement?.revisions?.[0];
  if (
    !entitlement ||
    entitlementState?.lifecycle !== "GRANTED" ||
    entitlementState?.enabled !== true ||
    entitlementState?.effectiveFrom > new Date() ||
    (entitlementState?.effectiveUntil &&
      entitlementState.effectiveUntil <= new Date())
  )
    throw new Error("SITE_ENTITLEMENT_NOT_ADMISSIBLE");
  const otherTenantEntitlements = await tx.$queryRaw`
    SELECT COUNT(*)::int AS count
       FROM "CapabilityEntitlement" e
       JOIN LATERAL (
         SELECT lifecycle, enabled, "effectiveFrom", "effectiveUntil"
           FROM "CapabilityEntitlementRevision" r
          WHERE r."entitlementId" = e.id
          ORDER BY "versionNumber" DESC
          LIMIT 1
       ) latest ON true
      WHERE e."organizationId" <> ${ORGANIZATION_ID}
        AND e."capabilityId" = ${capability.id}
        AND latest.lifecycle = 'GRANTED'
        AND latest.enabled = true
        AND latest."effectiveFrom" <= now()
        AND (latest."effectiveUntil" IS NULL OR latest."effectiveUntil" > now())`;
  if (Number(otherTenantEntitlements[0]?.count ?? 0) !== 0)
    throw new Error("CROSS_TENANT_REPORT_ENTITLEMENT_ACTIVE");

  const actor = await tx.user.findUnique({
    where: { email: "demo@getcoro.io" },
    select: { id: true, organizationId: true, isActive: true, role: true },
  });
  if (
    !actor ||
    !actor.isActive ||
    actor.organizationId !== ORGANIZATION_ID ||
    !["ADMIN", "SUPER_ADMIN"].includes(actor.role)
  )
    throw new Error("GOVERNED_ACTOR_NOT_ADMISSIBLE");

  const historicalTemplate = await tx.incidentReportTemplateVersion.findFirst({
    where: {
      organizationId: ORGANIZATION_ID,
      templateKey: HISTORICAL_TEMPLATE_KEY,
    },
    orderBy: { version: "desc" },
  });
  if (!historicalTemplate) throw new Error("HISTORICAL_TEMPLATE_MISSING");
  const historicalReportCount = await tx.incidentReport.count({
    where: {
      organizationId: ORGANIZATION_ID,
      templateVersion: { templateKey: HISTORICAL_TEMPLATE_KEY },
    },
  });
  if (historicalReportCount < 1) throw new Error("HISTORICAL_REPORT_MISSING");
  return {
    organization,
    client: client[0],
    building: building[0],
    identities,
    actor,
    entitlement,
    historicalTemplate,
    historicalReportCount,
  };
}

async function existingVersions(tx, catalog) {
  return tx.incidentReportTemplateVersion.findMany({
    where: {
      organizationId: ORGANIZATION_ID,
      templateKey: { in: catalog.map((template) => template.templateKey) },
    },
    orderBy: [{ templateKey: "asc" }, { version: "desc" }],
  });
}

function evidence(mode, target, plan, mutation, extra = {}) {
  return {
    schemaVersion: 1,
    execution: "PASS",
    mode,
    mutation,
    organizationFingerprint: fingerprint(target.organization.id),
    buildingFingerprint: fingerprint(target.building.id),
    identityFingerprints: Object.fromEntries(
      Object.entries(target.identities).map(([key, value]) => [
        key,
        fingerprint(value.id),
      ]),
    ),
    historical: {
      templateFingerprint: fingerprint(target.historicalTemplate.id),
      reportCount: target.historicalReportCount,
    },
    catalog: {
      total: plan.length,
      unchanged: plan.filter((item) => item.action === "UNCHANGED").length,
      create: plan.filter((item) => item.action === "CREATE").length,
      newVersion: plan.filter((item) => item.action === "NEW_VERSION").length,
      hashes: Object.fromEntries(
        plan.map((item) => [
          item.template.templateKey,
          item.template.contentHash,
        ]),
      ),
    },
    ...extra,
  };
}

async function inspect(tx, environment, catalog) {
  assertRuntimeFlags(environment);
  const target = await resolveTarget(tx);
  const plan = buildPlan(catalog, await existingVersions(tx, catalog));
  return { target, plan };
}

async function preflight(prisma, environment, catalog) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
    const result = await inspect(tx, environment, catalog);
    return evidence("preflight", result.target, result.plan, false);
  });
}

async function extend(prisma, environment, catalog, runId) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`coro-demo-report-20:${ORGANIZATION_ID}`}, 0))`;
      const { target, plan } = await inspect(tx, environment, catalog);
      const created = [];
      for (const item of plan) {
        if (item.action === "UNCHANGED") continue;
        const fixtureKey = `template:${item.template.templateKey}:${item.template.contentHash}`;
        const collision = await tx.demoFixtureRecord.findUnique({
          where: fixtureWhere(fixtureKey),
        });
        if (collision) throw new Error("FIXTURE_COLLISION");
        const version = await tx.incidentReportTemplateVersion.create({
          data: {
            organizationId: ORGANIZATION_ID,
            templateKey: item.template.templateKey,
            version: item.version,
            name: item.template.name,
            reportType: item.template.reportType,
            status: "PUBLISHED",
            schemaVersion: item.template.formSchema.schemaVersion,
            formSchema: item.template.formSchema,
            fieldCatalog: item.template.fieldCatalog,
            mappingMetadata: undefined,
            contentHash: item.template.contentHash,
            publishedAt: new Date(),
            createdByActorType: "USER",
            createdByActorId: target.actor.id,
          },
        });
        await tx.demoFixtureRecord.create({
          data: {
            organizationId: ORGANIZATION_ID,
            fixtureNamespace: FIXTURE_NAMESPACE,
            fixtureKey,
            entityType: "INCIDENT_REPORT_TEMPLATE_VERSION_R2",
            entityId: version.id,
            state: "ACTIVE",
            baseline: {
              templateKey: item.template.templateKey,
              contentHash: item.template.contentHash,
              previousId: item.previousId,
              reversible: true,
            },
          },
        });
        created.push(version.id);
      }
      await tx.adminAuditEvent.create({
        data: {
          actorType: "INTERNAL_USER",
          actorUserId: target.actor.id,
          actorDisplayName: "CORO Demo Report 2.0 governed extension",
          actorRole: target.actor.role,
          action: "CORO_DEMO_REPORT_20_TEMPLATES_EXTENDED",
          targetType: "Organization",
          targetId: ORGANIZATION_ID,
          organizationId: ORGANIZATION_ID,
          reason: "Explicit owner authorization required before execution",
          requestId: String(runId),
          afterData: {
            createdCount: created.length,
            unchangedCount: plan.length - created.length,
            buildingFingerprint: BUILDING_FINGERPRINT,
          },
        },
      });
      return evidence("extend", target, plan, created.length > 0, {
        createdCount: created.length,
      });
    },
    { isolationLevel: "Serializable", timeout: 60_000 },
  );
}

async function verify(prisma, environment, catalog) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
    const { target, plan } = await inspect(tx, environment, catalog);
    if (plan.some((item) => item.action !== "UNCHANGED"))
      throw new Error("CATALOG_POSTCONDITION_FAILED");
    return evidence("verify", target, plan, false);
  });
}

async function rollback(prisma, environment, catalog, runId) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`coro-demo-report-20:${ORGANIZATION_ID}`}, 0))`;
      const { target } = await inspect(tx, environment, catalog);
      const records = await tx.demoFixtureRecord.findMany({
        where: {
          organizationId: ORGANIZATION_ID,
          fixtureNamespace: FIXTURE_NAMESPACE,
          entityType: "INCIDENT_REPORT_TEMPLATE_VERSION_R2",
          state: "ACTIVE",
        },
      });
      for (const record of records) {
        const references = await tx.incidentReport.count({
          where: {
            organizationId: ORGANIZATION_ID,
            templateVersionId: record.entityId,
          },
        });
        if (references !== 0) throw new Error("ROLLBACK_TEMPLATE_IN_USE");
      }
      for (const record of records) {
        await tx.incidentReportTemplateVersion.updateMany({
          where: {
            id: record.entityId,
            organizationId: ORGANIZATION_ID,
          },
          data: { status: "RETIRED", retiredAt: new Date() },
        });
      }
      await tx.demoFixtureRecord.updateMany({
        where: {
          organizationId: ORGANIZATION_ID,
          fixtureNamespace: FIXTURE_NAMESPACE,
          state: "ACTIVE",
        },
        data: { state: "RETIRED" },
      });
      await tx.adminAuditEvent.create({
        data: {
          actorType: "INTERNAL_USER",
          actorUserId: target.actor.id,
          actorDisplayName: "CORO Demo Report 2.0 governed rollback",
          actorRole: target.actor.role,
          action: "CORO_DEMO_REPORT_20_TEMPLATES_ROLLED_BACK",
          targetType: "Organization",
          targetId: ORGANIZATION_ID,
          organizationId: ORGANIZATION_ID,
          reason: "Governed rollback of extension-owned unused versions",
          requestId: String(runId),
          afterData: { retiredCount: records.length },
        },
      });
      return {
        schemaVersion: 1,
        execution: "PASS",
        mode: "rollback",
        mutation: records.length > 0,
        retiredCount: records.length,
        historicalPreserved: true,
      };
    },
    { isolationLevel: "Serializable", timeout: 60_000 },
  );
}

async function run(
  prisma,
  mode,
  environment = process.env,
  runId = "manual",
  catalog = loadCatalog(),
) {
  if (!MODES.has(mode)) throw new Error("INVALID_MODE");
  if (mode === "preflight") return preflight(prisma, environment, catalog);
  if (mode === "extend") return extend(prisma, environment, catalog, runId);
  if (mode === "verify") return verify(prisma, environment, catalog);
  return rollback(prisma, environment, catalog, runId);
}

async function main() {
  if (process.env.CORO_DEMO_REPORT_20_RUN !== "true")
    throw new Error("EXPLICIT_RUNTIME_SWITCH_REQUIRED");
  const { PrismaClient } = require("/app/node_modules/@prisma/client");
  const prisma = new PrismaClient();
  try {
    process.stdout.write(
      `${JSON.stringify(await run(prisma, process.argv[2], process.env, process.env.GITHUB_RUN_ID))}\n`,
    );
  } catch (error) {
    const candidate = error instanceof Error ? error.message : "";
    const errorCode = /^[A-Z][A-Z0-9_]{2,100}$/.test(candidate)
      ? candidate
      : "INTERNAL_ERROR";
    process.stdout.write(
      `${JSON.stringify({ schemaVersion: 1, execution: "FAIL", mode: process.argv[2], errorCode })}\n`,
    );
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = {
  assertRuntimeFlags,
  buildPlan,
  canonicalTemplate,
  fieldCatalog,
  fingerprint,
  loadCatalog,
  run,
};
if (require.main === module) main();
