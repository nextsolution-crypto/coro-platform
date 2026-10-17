/* eslint-disable @typescript-eslint/no-require-imports */
// Garde-fous du workflow de contrôles frontend sur Pull Request (.github/workflows/frontend-pr-checks.yml).
// Le workflow exécute le code d'une PR : il doit rester en lecture seule, sans secret, sans déploiement, sans publication.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..', '..');
const file = path.join(root, '.github', 'workflows', 'frontend-pr-checks.yml');
const yml = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const code = yml.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', '..', 'package.json'), 'utf8'));

test('déclenché uniquement par pull_request (jamais pull_request_target, push, manuel, planifié)', () => {
  assert.match(code, /^on:\n  pull_request:\n/m);
  for (const forbidden of ['pull_request_target', 'workflow_dispatch', 'workflow_run', 'schedule:', '\n  push:', 'repository_dispatch']) {
    assert.ok(!code.includes(forbidden), `déclencheur interdit : ${forbidden}`);
  }
  assert.match(code, /"coro-frontend\/\*\*"/);
  assert.match(code, /"\.github\/workflows\/frontend-pr-checks\.yml"/);
});

test('jeton en lecture seule : contents: read, aucune permission d’écriture', () => {
  assert.match(code, /^permissions:\n  contents: read\n/m);
  assert.ok(!/:\s*write\b/.test(code), 'aucune permission « write »');
  assert.ok(!/(id-token|packages|deployments|pull-requests|actions|checks|statuses|security-events)\s*:/.test(code.split('jobs:')[0]), 'aucune permission supplémentaire');
  assert.ok(!/^\s{4,}permissions:/m.test(code), 'aucune élévation de permissions au niveau d’un job');
});

test('aucun secret, environnement protégé, déploiement, image, SSH ni publication', () => {
  for (const forbidden of ['secrets.', 'environment:', 'docker', 'ssh', 'appleboy', 'upload-artifact', 'login-action', 'build-push', 'deploy', 'production-inspection', 'DEPLOY_PRODUCTION', 'release_commit', 'git push', 'gh release', 'npm publish']) {
    assert.ok(!code.toLowerCase().includes(forbidden.toLowerCase()), `élément interdit : ${forbidden}`);
  }
});

test('actions épinglées par empreinte de commit (40 hexadécimaux) et identifiants non conservés', () => {
  const uses = [...code.matchAll(/uses:\s*(\S+)/g)].map((m) => m[1]);
  assert.ok(uses.length >= 2);
  for (const u of uses) assert.match(u, /^actions\/[a-z-]+@[0-9a-f]{40}$/, `non épinglée : ${u}`);
  const checkouts = (code.match(/actions\/checkout@/g) || []).length;
  assert.equal((code.match(/persist-credentials: false/g) || []).length, checkouts);
});

test('Node 22, lockfile existant, installation par npm ci', () => {
  assert.match(code, /node-version: 22/);
  assert.match(code, /cache-dependency-path: coro-frontend\/package-lock\.json/);
  assert.match(code, /run: npm ci\n/);
  assert.ok(fs.existsSync(path.resolve(__dirname, '..', '..', 'package-lock.json')));
});

test('contrôles obligatoires présents', () => {
  for (const needed of ['npx tsc --noEmit', 'npm run test:design-system', 'npm run test:settings-glass', 'npm run test:portfolio-glass', 'npm run test:platform-permission-grants', 'npm run test:auth-hydration', 'npm run test:rendement', 'npm run test:bookings', 'npm run test:planning', 'npm run test:commercial-contracts', 'node design-system/tools/production-check.cjs']) {
    assert.ok(code.includes(needed), `contrôle absent : ${needed}`);
  }
});

test('chaque script npm référencé existe', () => {
  const names = [...code.matchAll(/npm run ([\w:-]+)/g)].map((m) => m[1]);
  assert.ok(names.length > 10);
  for (const n of names) assert.ok(pkg.scripts[n], `script absent de package.json : ${n}`);
});

test('« continue-on-error » réservé au job des échecs connus de main (2 contrats), jamais au job bloquant', () => {
  assert.equal((code.match(/continue-on-error/g) || []).length, 1);
  const blocking = code.split('known-main-failures:')[0];
  assert.ok(!blocking.includes('continue-on-error'));
  const known = code.split('known-main-failures:')[1];
  assert.equal((known.match(/run: node /g) || []).length, 2);
  assert.ok(known.includes('journey.contract.test.cjs') && known.includes('commercial-navigation.contract.test.cjs'));
});
