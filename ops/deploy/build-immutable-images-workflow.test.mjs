import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync(
  new URL('../../.github/workflows/build-immutable-images.yml', import.meta.url),
  'utf8',
);

test('build-only workflow is fail-closed and cannot deploy', () => {
  assert.match(workflow, /BUILD_IMAGES_ONLY/);
  assert.match(workflow, /git cat-file -e/);
  assert.match(workflow, /git merge-base --is-ancestor/);
  assert.match(workflow, /git status --porcelain/);
  assert.match(workflow, /packages: write/);
  assert.match(workflow, /secrets\.GITHUB_TOKEN/);
  assert.doesNotMatch(workflow, /secrets\.GHCR_TOKEN/);
  assert.match(workflow, /release-policy\.mjs images/);
  assert.doesNotMatch(workflow, /environment:\s*production/);
  assert.doesNotMatch(workflow, /production-release/);
  assert.doesNotMatch(workflow, /appleboy\/ssh-action/);
});

test('all four immutable release images are built from the candidate SHA', () => {
  for (const image of [
    'coro-backend',
    'coro-frontend',
    'coro-client-portal',
    'coro-website',
  ]) {
    assert.match(
      workflow,
      new RegExp(`${image}:\\$\\{\\{ needs\\.validate\\.outputs\\.candidate \\}\\}`),
    );
  }
});
