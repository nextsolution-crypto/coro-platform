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
  assert.doesNotMatch(workflow, /organization[_-]?id.*inputs/i);
});

test("document authority uses canonical services and has no public storage fallback", () => {
  assert.match(authority, /ProjectFilesService/);
  assert.match(authority, /KnowledgeIngestionService/);
  assert.match(authority, /KnowledgeRetrievalService/);
  assert.match(authority, /downloadPrivateFile/);
  assert.doesNotMatch(authority, /public-read|axios|fetch\(/i);
});
