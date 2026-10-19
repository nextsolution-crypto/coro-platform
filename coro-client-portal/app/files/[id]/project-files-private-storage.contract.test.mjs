import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

test('portal lists files through the client-scoped route', () => {
  assert.match(source, /`\/project-files\/client\/\$\{projectId\}\?visibility=shared`/);
  assert.doesNotMatch(source, /`\/project-files\/project\/\$\{projectId\}/);
});

test('private portal downloads retain client authentication', () => {
  assert.match(source, /file\.url !== 'private:project-file'/);
  assert.match(source, /project-files\/client\/file\/\$\{file\.id\}\/content/);
  assert.match(source, /Authorization: `Bearer \$\{token\}`/);
  assert.match(source, /URL\.revokeObjectURL/);
});
