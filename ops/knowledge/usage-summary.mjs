import { createInterface } from 'node:readline';
import { pathToFileURL } from 'node:url';

export function summarize(records) {
  const summary = { calls: 0, failures: 0, inputTokens: 0, outputTokens: 0, usageUnknown: 0 };
  for (const record of records) {
    if (record?.event !== 'CORO_AI_USAGE' || !['SUCCESS', 'PROVIDER_FAILURE'].includes(record.status)) continue;
    summary.calls++;
    if (record.status === 'PROVIDER_FAILURE') { summary.failures++; continue; }
    if (![record.inputTokens, record.outputTokens].every(value => Number.isSafeInteger(value) && value >= 0)) { summary.usageUnknown++; continue; }
    summary.inputTokens += record.inputTokens; summary.outputTokens += record.outputTokens;
  }
  return summary;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const records = [];
  const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const line of input) {
    if (line.length > 4096) continue;
    try { const record = JSON.parse(line); if (record?.event === 'CORO_AI_USAGE') records.push(record); } catch { /* unrelated application log */ }
    if (records.length > 100000) { console.error('KNOWLEDGE_USAGE_INPUT_LIMIT'); process.exit(1); }
  }
  console.log(JSON.stringify(summarize(records)));
}
