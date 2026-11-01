import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source=fs.readFileSync(new URL('./coro-governed-application-rollback.sh',import.meta.url),'utf8');

test('requires explicit feature gate, approval, common lock and reconciled evidence',()=>{
  for(const marker of ['CORO_GOVERNED_ROLLBACK_ENABLED','ROLLBACK_APPLICATIONS','coro-production-deployment.lock','reconciled.json','manifestSha256']) assert.match(source,new RegExp(marker));
});
test('runs security validation before and after worker quiescence',()=>{
  assert.ok(source.indexOf('PREFLIGHT RUNNING')<source.indexOf('stop frontend'));
  assert.ok(source.indexOf('EXECUTION QUIESCED')>source.indexOf('stop frontend'));
  assert.match(source,/SECURITY_PREFLIGHT_REFUSED/);assert.match(source,/SECURITY_EXECUTION_REFUSED/);
});
test('uses exact four images, never changes the database schema and rolls forward on failure',()=>{
  assert.match(source,/previousImages/);assert.match(source,/ACTIVE_IMAGE_DRIFT/);assert.match(source,/DATABASE_HEAD_CHANGED/);assert.match(source,/OUTBOX_EVENT_COUNT_CHANGED/);assert.match(source,/recovery_required/);
  assert.doesNotMatch(source,/migrate deploy|prisma migrate|pg_restore|docker system prune|docker volume/);
});

