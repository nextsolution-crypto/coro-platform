import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../../..');

test('Timelog personal writes are scoped to authenticated owner and tenant', async () => {
  const source = await readFile(resolve(root, 'coro-backend/src/timelog/timelog.service.ts'), 'utf8');
  assert.match(source, /where: \{ id: entryId, userId, organizationId \}/);
});

test('Timelog general time and project task time remain distinct authorities', async () => {
  const timelog = await readFile(resolve(root, 'coro-backend/src/timelog/timelog.service.ts'), 'utf8');
  const rendement = await readFile(resolve(root, 'coro-backend/src/mandate/rendement-financial.service.ts'), 'utf8');
  assert.match(timelog, /isBillable: false/);
  assert.doesNotMatch(rendement, /timelogEntry|TimelogEntry/);
});

test('characterizes missing typed validation without accepting it', async () => {
  const controller = await readFile(resolve(root, 'coro-backend/src/timelog/timelog.controller.ts'), 'utf8');
  assert.match(controller, /@Body\(\) dto: any/);
});
