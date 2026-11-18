'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const compose = fs.readFileSync(path.join(__dirname, '..', '..', 'docker-compose.yml'), 'utf8');
const flags = [
  'INCIDENT_REPORTS_ENABLED',
  'OPERATIONAL_LOG_ENABLED',
  'OPERATIONAL_SHIFTS_ENABLED',
  'OPERATIONAL_DIRECTIVES_ENABLED',
  'OPERATIONAL_FOLLOWUPS_ENABLED',
];

test('all CORO Report and workstation flags are propagated fail-closed', () => {
  for (const flag of flags) {
    const line = `${flag}: \${${flag}:-false}`;
    assert.equal(compose.split(line).length - 1, 1, `${flag} must be declared exactly once and default false`);
  }
});
