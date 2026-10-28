'use strict';

const PAGE_SIZE = 100;
const MAX_GROUPS = 10_000;

function summarize(groups) {
  const byDocumentType = {};
  const byProjectStatus = {};
  const byDocumentStatus = {};
  let documentCount = 0;
  for (const group of groups) {
    documentCount += group.documentCount;
    byDocumentType[group.documentType] = (byDocumentType[group.documentType] || 0) + 1;
    byProjectStatus[group.projectStatus] = (byProjectStatus[group.projectStatus] || 0) + 1;
    for (const status of group.documentStatuses) {
      byDocumentStatus[status] = (byDocumentStatus[status] || 0) + 1;
    }
  }
  return { groupCount: groups.length, documentCount, byDocumentType, byProjectStatus, byDocumentStatus };
}

async function collectDuplicateInventory(fetchPage) {
  const groups = [];
  let afterProjectId = '';
  while (true) {
    const page = await fetchPage({ afterProjectId, take: PAGE_SIZE });
    if (!Array.isArray(page) || page.length > PAGE_SIZE) throw new Error('INVALID_PAGE');
    if (page.length === 0) break;
    for (const row of page) {
      if (!row.projectId || !row.organizationId || !Number.isInteger(row.documentCount) || row.documentCount < 2)
        throw new Error('INVALID_DUPLICATE_GROUP');
      groups.push(row);
      if (groups.length > MAX_GROUPS) throw new Error('DUPLICATE_GROUP_LIMIT_EXCEEDED');
    }
    const next = page.at(-1).projectId;
    if (next <= afterProjectId) throw new Error('NON_MONOTONIC_PAGE');
    afterProjectId = next;
    if (page.length < PAGE_SIZE) break;
  }
  return {
    schemaVersion: 1,
    execution: 'PASS',
    readOnly: true,
    definition: 'More than one canonical Document row for the same Project; all Document and Project statuses are included; ProjectVersion rows are excluded.',
    ...summarize(groups),
    groups,
  };
}

function sanitizedReport(report) {
  const { groups: _groups, ...safe } = report;
  return safe;
}

async function runReadOnlyInventory(prisma) {
  return prisma.$transaction(async (transaction) => {
    await transaction.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    return collectDuplicateInventory(async ({ afterProjectId, take }) => {
      const rows = await transaction.$queryRawUnsafe(`
        SELECT
          p."id" AS "projectId",
          p."organizationId" AS "organizationId",
          p."documentType"::text AS "documentType",
          p."status"::text AS "projectStatus",
          p."isActive" AS "projectActive",
          COUNT(d."id")::int AS "documentCount",
          ARRAY_AGG(d."status"::text ORDER BY d."id") AS "documentStatuses"
        FROM "Project" p
        INNER JOIN "Document" d ON d."projectId" = p."id"
        WHERE p."id" > $1
        GROUP BY p."id", p."organizationId", p."documentType", p."status", p."isActive"
        HAVING COUNT(d."id") > 1
        ORDER BY p."id" ASC
        LIMIT $2
      `, afterProjectId, take);
      return rows;
    });
  }, { timeout: 300_000 });
}

async function main() {
  if (process.env.CORO_DOCUMENT_DUPLICATE_INVENTORY_RUN !== 'true')
    throw new Error('EXPLICIT_RUNTIME_SWITCH_REQUIRED');
  const { PrismaClient } = require('/app/node_modules/@prisma/client');
  const prisma = new PrismaClient();
  try {
    const report = await runReadOnlyInventory(prisma);
    process.stdout.write(`${JSON.stringify(report)}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { collectDuplicateInventory, runReadOnlyInventory, sanitizedReport, summarize };

if (require.main === module) main().catch(() => {
  process.stdout.write(`${JSON.stringify({ schemaVersion: 1, execution: 'FAILED', readOnly: true })}\n`);
  process.exitCode = 1;
});
