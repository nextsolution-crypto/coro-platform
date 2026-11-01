'use strict';

const crypto = require('node:crypto');

function digest(value) { return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
function summarize(rows) {
  const fields = {};
  let resolved = 0;
  for (const row of rows) {
    const entry = fields[row.field] ||= { conflicts: 0, resolved: 0, unresolved: 0, distinctValueSets: new Set() };
    entry.conflicts += 1;
    if (row.resolvedAt) { entry.resolved += 1; resolved += 1; } else entry.unresolved += 1;
    entry.distinctValueSets.add(digest(row.values));
  }
  return {
    schemaVersion: 1, execution: 'PASS', readOnly: true, containsSettingsValues: false,
    totals: { conflicts: rows.length, resolved, unresolved: rows.length - resolved, organizationsAffected: new Set(rows.map((row) => row.organizationId)).size },
    fields: Object.fromEntries(Object.entries(fields).sort().map(([field, value]) => [field, { conflicts: value.conflicts, resolved: value.resolved, unresolved: value.unresolved, distinctValueSetFingerprints: value.distinctValueSets.size }])),
    decision: rows.length === resolved ? 'NO_UNRESOLVED_DECISION' : 'HUMAN_AUTHORITY_REQUIRED_FOR_AMBIGUOUS_VALUES',
  };
}
async function runReadOnly(prisma) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    const rows = await tx.organizationSettingsConflict.findMany({ select: { organizationId: true, field: true, values: true, resolvedAt: true } });
    return summarize(rows);
  }, { timeout: 60_000 });
}
async function main() {
  if (process.env.CORO_SETTINGS_CONFLICT_INVENTORY_RUN !== 'true') throw new Error('EXPLICIT_RUNTIME_SWITCH_REQUIRED');
  const { PrismaClient } = require('/app/node_modules/@prisma/client');
  const prisma = new PrismaClient();
  try { process.stdout.write(`${JSON.stringify(await runReadOnly(prisma))}\n`); } finally { await prisma.$disconnect(); }
}
module.exports = { runReadOnly, summarize };
if (require.main === module || process.env.CORO_SETTINGS_CONFLICT_INVENTORY_RUN === 'true') main().catch(() => { process.stdout.write('{"schemaVersion":1,"execution":"FAILED","readOnly":true}\n'); process.exitCode = 1; });
