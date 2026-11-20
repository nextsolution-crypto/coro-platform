import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('./coro-memory-audit.mjs', import.meta.url), 'utf8');

test('memory audit is read-only and emits the required evidence boundaries', () => {
  for (const expected of [
    '/proc/meminfo',
    '/proc/pressure/memory',
    '/proc/pressure/cpu',
    'MemAvailable',
    'SwapTotal',
    'docker',
    'stats',
    'system',
    'df',
    'oomEventsLast24Hours',
    'topProcesses',
    'containerPolicies',
    'stoppedContainers',
    'failedSystemdUnits',
    'peakLoadEvidence',
    "mutation: false",
  ]) assert.match(source, new RegExp(expected.replaceAll('/', '\\/')));
  assert.doesNotMatch(source, /run\(['"](?:rm|reboot|shutdown)['"]/u);
  assert.doesNotMatch(source, /run\(['"]docker['"],\s*\[['"](?:rm|rmi|prune|stop|kill|restart|down|up|pull|push)['"]/u);
  assert.doesNotMatch(source, /cmdline|environ|docker logs|journalctl[^\n]*-u/u);
});

test('ClamAV gate remains fixed at three GiB of genuinely available memory', () => {
  assert.match(source, /REQUIRED_AVAILABLE_BYTES = 3 \* GIB/);
  assert.match(source, /availableBytes >= REQUIRED_AVAILABLE_BYTES/);
});
