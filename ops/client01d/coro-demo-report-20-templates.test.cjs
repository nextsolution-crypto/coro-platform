"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  assertRuntimeFlags,
  buildPlan,
  buildRetentionPlan,
  canonicalTemplate,
} = require("./coro-demo-report-20-templates.cjs");

const source = fs.readFileSync(
  path.join(__dirname, "coro-demo-report-20-templates.cjs"),
  "utf8",
);
const workflow = fs.readFileSync(
  path.join(
    __dirname,
    "..",
    "..",
    ".github",
    "workflows",
    "production-coro-demo-report-20-templates.yml",
  ),
  "utf8",
);

const flags = {
  INCIDENT_REPORTS_ENABLED: "true",
  INCIDENT_REPORT_ATTACHMENTS_ENABLED: "false",
  INCIDENT_REPORT_IMPORT_ENABLED: "false",
};

test("extension requires Report and refuses unsafe file capabilities", () => {
  assert.doesNotThrow(() => assertRuntimeFlags(flags));
  for (const name of Object.keys(flags)) {
    const invalid = { ...flags, [name]: flags[name] === "true" ? "false" : "true" };
    assert.throws(() => assertRuntimeFlags(invalid), new RegExp(`FLAG_${name}_INVALID`));
  }
  // Pièces jointes admises sous quarantaine ClamAV ; la main courante n'entre pas en jeu.
  for (const mode of ["ON_DEMAND", "INLINE"])
    assert.doesNotThrow(() =>
      assertRuntimeFlags({ ...flags, INCIDENT_REPORT_ATTACHMENTS_ENABLED: "true", INCIDENT_REPORT_CLAMAV_MODE: mode, OPERATIONAL_LOG_ENABLED: "true" }),
    );
});

test("canonical template requires schema 1.1 and produces a stable hash", () => {
  const template = {
    templateKey: "TEST",
    name: "Test",
    reportType: "TEST",
    formSchema: {
      schemaVersion: "1.1",
      sections: [
        {
          key: "main",
          title: "Main",
          fields: [{ key: "summary", label: "Summary", type: "LONG_TEXT" }],
        },
      ],
    },
  };
  const validate = (schema) => schema;
  const first = canonicalTemplate(template, validate);
  const second = canonicalTemplate(template, validate);
  assert.equal(first.contentHash, second.contentHash);
  assert.equal(first.fieldCatalog.summary.sectionKey, "main");
  assert.throws(
    () =>
      canonicalTemplate(
        {
          ...template,
          formSchema: { ...template.formSchema, schemaVersion: "1.0" },
        },
        validate,
      ),
    /CATALOG_SCHEMA_VERSION_INVALID/,
  );
});

test("plan is idempotent and versions changed hashes without overwriting", () => {
  const catalog = [
    { templateKey: "A", contentHash: "hash-a" },
    { templateKey: "B", contentHash: "hash-b-new" },
    { templateKey: "C", contentHash: "hash-c" },
  ];
  const existing = [
    {
      id: "a1",
      templateKey: "A",
      version: 1,
      contentHash: "hash-a",
      status: "PUBLISHED",
    },
    {
      id: "b1",
      templateKey: "B",
      version: 1,
      contentHash: "hash-b-old",
      status: "PUBLISHED",
    },
  ];
  assert.deepEqual(
    buildPlan(catalog, existing).map(({ action, version }) => ({
      action,
      version,
    })),
    [
      { action: "UNCHANGED", version: undefined },
      { action: "NEW_VERSION", version: 2 },
      { action: "CREATE", version: 1 },
    ],
  );
});

test("retention plan creates only missing report-type policies and fails closed on inactive policies", () => {
  const catalog = [
    { reportType: "GENERAL_INCIDENT" },
    { reportType: "FIRE_ALARM" },
    { reportType: "EVACUATION" },
  ];
  assert.deepEqual(
    buildRetentionPlan(catalog, [
      { id: "policy-general", reportType: "GENERAL_INCIDENT", isActive: true },
      { id: "policy-fire", reportType: "FIRE_ALARM", isActive: false },
    ]).map(({ action, existingId }) => ({ action, existingId })),
    [
      { action: "UNCHANGED", existingId: "policy-general" },
      { action: "INACTIVE", existingId: "policy-fire" },
      { action: "CREATE", existingId: null },
    ],
  );
});

test("scope and historical safeguards are fixed in the authority", () => {
  assert.match(
    source,
    /ORGANIZATION_ID = ["']916f54ec-af22-45e0-99db-a369d9630002["']/,
  );
  assert.match(source, /scope: ["']SITE["']/);
  assert.match(source, /HISTORICAL_TEMPLATE_MISSING/);
  assert.match(source, /HISTORICAL_REPORT_MISSING/);
  assert.match(source, /CROSS_TENANT_REPORT_ENTITLEMENT_ACTIVE/);
  assert.match(source, /ROLLBACK_TEMPLATE_IN_USE/);
  assert.match(source, /ROLLBACK_POLICY_IN_USE/);
  assert.match(source, /INCIDENT_REPORT_RETENTION_POLICY_R2/);
  assert.match(source, /retainForDays: 365/);
  assert.match(source, /retentionPolicyId: record\.entityId/);
  assert.match(source, /fixtureNamespace: FIXTURE_NAMESPACE/);
  assert.doesNotMatch(source, /deleteMany|\.delete\(/);
});

test("workflow is production-protected, locked, backed up and has exact approvals", () => {
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /coro-production-deployment\.lock/);
  assert.match(workflow, /coro-db-backup\.service/);
  assert.match(workflow, /coro-db-restore-test\.service/);
  assert.match(workflow, /application_commit:/);
  assert.match(workflow, /fetch-depth: 0/);
  assert.match(
    workflow,
    /EXPECTED_ACTIVE_SHA: \$\{\{ inputs\.application_commit \}\}/,
  );
  assert.match(workflow, /validate-demo-report-application-commit\.mjs/);
  assert.match(workflow, /migration_count.*202/);
  assert.match(workflow, /20261224010000_incident_report_historical_search/);
  assert.match(workflow, /rollback_refs/);
  assert.match(workflow, /10485760/);
  assert.match(workflow, /EXTEND_EXISTING_REPORT_TEMPLATES/);
  assert.match(workflow, /VERIFY_EXISTING_REPORT_TEMPLATES/);
  assert.match(workflow, /ROLLBACK_EXISTING_REPORT_TEMPLATES/);
  assert.doesNotMatch(
    workflow,
    /docker compose up|prisma migrate|system prune/,
  );
});
