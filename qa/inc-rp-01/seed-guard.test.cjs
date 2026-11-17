const test = require('node:test');
const assert = require('node:assert/strict');
const { assertQaTarget } = require('./seed.cjs');

const valid = {
  NODE_ENV: 'test',
  INC_RP_QA_CONFIRM: 'SYNTHETIC_LOCAL_ONLY',
  DATABASE_URL: 'postgresql://coro_report_qa:ignored@127.0.0.1:55433/coro_report_qa?schema=public',
};

test('accepts only the explicit isolated database target', () => {
  assert.doesNotThrow(() => assertQaTarget(valid));
});

test('rejects production, missing confirmation and non-local targets', () => {
  assert.throws(() => assertQaTarget({ ...valid, NODE_ENV: 'production' }), /forbidden/);
  assert.throws(() => assertQaTarget({ ...valid, INC_RP_QA_CONFIRM: '' }), /CONFIRM/);
  assert.throws(() => assertQaTarget({ ...valid, DATABASE_URL: 'postgresql://coro_report_qa:x@db.example.test:5432/coro_report_qa' }), /isolated local/);
  assert.throws(() => assertQaTarget({ ...valid, DATABASE_URL: 'postgresql://coro_report_qa:x@127.0.0.1:5432/coro' }), /isolated local/);
});
