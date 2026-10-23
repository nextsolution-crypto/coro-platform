import test from 'node:test';
import assert from 'node:assert/strict';
import { summarize } from './usage-summary.mjs';
test('usage telemetry aggregates counts only and never echoes input or private fields', () => {
  const result = summarize([
    { event:'CORO_AI_USAGE',status:'SUCCESS',inputTokens:10,outputTokens:5,prompt:'PRIVATE' },
    { event:'CORO_AI_USAGE',status:'PROVIDER_FAILURE',error:'PRIVATE' },
    { event:'CORO_AI_USAGE',status:'SUCCESS',inputTokens:null,outputTokens:null },
    { event:'OTHER',status:'SUCCESS',inputTokens:9000,outputTokens:9000 },
  ]);
  assert.deepEqual(result,{calls:3,failures:1,inputTokens:10,outputTokens:5,usageUnknown:1});
  assert.ok(!JSON.stringify(result).includes('PRIVATE'));
});
