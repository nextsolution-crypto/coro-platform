import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./ProjectFiles.tsx', import.meta.url), 'utf8');

test('private project files use the authenticated application download route', () => {
  assert.match(source, /file\.url !== 'private:project-file'/);
  assert.match(source, /api\.get\(`\/project-files\/\$\{file\.id\}\/content`/);
  assert.match(source, /responseType: 'blob'/);
  assert.match(source, /URL\.revokeObjectURL/);
});

test('historical public project file URLs remain supported', () => {
  assert.match(source, /window\.open\(file\.url, '_blank', 'noopener,noreferrer'\)/);
});
