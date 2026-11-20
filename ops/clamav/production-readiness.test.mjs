import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const script = fs.readFileSync(new URL('./production-readiness.sh', import.meta.url), 'utf8');

test('production readiness is fail-closed and never exposes ClamAV publicly', () => {
  for (const token of [
    'INSUFFICIENT_AVAILABLE_MEMORY',
    'CONTAINER_UNHEALTHY',
    'PORT_PUBLISHED',
    'IMAGE_MISMATCH',
    'INSTREAM_FAILED',
    'eicarInstream',
    'importEnabled',
  ]) assert.match(script, new RegExp(token));
  assert.doesNotMatch(script, /docker\s+(?:compose\s+)?up|docker\s+pull|docker\s+restart/);
});
