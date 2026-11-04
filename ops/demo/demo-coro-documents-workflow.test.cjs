const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const workflow = fs.readFileSync(
  path.join(
    __dirname,
    "..",
    "..",
    ".github",
    "workflows",
    "production-demo-coro-documents.yml",
  ),
  "utf8",
);
const authority = fs.readFileSync(
  path.join(
    __dirname,
    "..",
    "..",
    "coro-backend",
    "scripts",
    "demo-document-knowledge.ts",
  ),
  "utf8",
);

test("document workflow is fixed, locked, backed up and release-pinned", () => {
  assert.match(workflow, /options: \[dry-run, prepare, verify, reset\]/);
  assert.match(workflow, /coro-production-deployment\.lock/);
  assert.match(workflow, /coro-db-backup\.service/);
  assert.match(workflow, /RELEASE_COMMIT/);
  assert.match(workflow, /production-\$RELEASE_COMMIT\.reconciled\.json/);
  assert.match(workflow, /git -C "\$repo" rev-parse HEAD/);
  assert.match(workflow, /CORO_DEMO_DOCUMENTS_RUN=true/);
  assert.match(workflow, /DEMO_DOCUMENT_EVIDENCE_NOT_FOUND/);
  assert.match(workflow, /candidate\?\.schemaVersion===1/);
  assert.match(workflow, /rm -f -- "\$raw" "\$evidence"/);
  assert.doesNotMatch(workflow, /organization[_-]?id.*inputs/i);
});

test("document authority uses canonical services and has no public storage fallback", () => {
  assert.match(authority, /ProjectFilesService/);
  assert.match(authority, /KnowledgeIngestionService/);
  assert.match(authority, /KnowledgeRetrievalService/);
  assert.match(authority, /downloadPrivateFile/);
  assert.doesNotMatch(authority, /public-read|axios|fetch\(/i);
});

test("document lifecycle transitions use the canonical project custodian", () => {
  assert.match(authority, /project\.user\.organizationId !== ORGANIZATION_ID/);
  assert.match(authority, /!project\.user\.isActive/);
  assert.match(authority, /return \{ referenceUser, projectCustodian: project\.user \}/);
  assert.match(authority, /userId: projectCustodian\.id/);
  assert.match(authority, /role: projectCustodian\.role/);
});
