/* eslint-disable @typescript-eslint/no-require-imports */
// Garde-fous du workflow de contrôles du portail client sur Pull Request (.github/workflows/portal-pr-checks.yml).
// Comme celui du frontend, il exécute le code d'une PR : lecture seule, sans secret, sans déploiement, sans publication.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..', '..');
const yml = fs.readFileSync(path.join(root, '.github', 'workflows', 'portal-pr-checks.yml'), 'utf8').replace(/\r\n/g, '\n');
const code = yml.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'coro-client-portal', 'package.json'), 'utf8'));

test('déclenché uniquement par pull_request sur le portail, la garde du jeton et ce workflow', () => {
  assert.match(code, /^on:\n  pull_request:\n/m);
  for (const forbidden of ['pull_request_target', 'workflow_dispatch', 'workflow_run', 'schedule:', '\n  push:', 'repository_dispatch']) assert.ok(!code.includes(forbidden), forbidden);
  assert.match(code, /"coro-client-portal\/\*\*"/);
  assert.match(code, /"ops\/deploy\/glass-preview-token\.test\.mjs"/);
});

test('jeton en lecture seule, aucune élévation, aucun secret ni déploiement ni image ni publication', () => {
  assert.match(code, /^permissions:\n  contents: read\n/m);
  assert.ok(!/:\s*write\b/.test(code) && !/^\s{4,}permissions:/m.test(code));
  const scan = code.replace(/ops\/deploy\//g, 'ops/_/'); // le chemin du test de garde contient « deploy »
  for (const forbidden of ['secrets.', 'environment:', 'docker', 'ssh', 'appleboy', 'upload-artifact', 'login-action', 'build-push', 'deploy', 'production-inspection', 'DEPLOY_PRODUCTION', 'release_commit', 'git push', 'gh release', 'npm publish', 'GLASS_BETA']) {
    assert.ok(!scan.toLowerCase().includes(forbidden.toLowerCase()), `élément interdit : ${forbidden}`);
  }
});

test('actions épinglées par empreinte, identifiants non conservés, Node 22, npm ci sur le verrou du portail', () => {
  const uses = [...code.matchAll(/uses:\s*(\S+)/g)].map((m) => m[1]);
  assert.ok(uses.length >= 2);
  for (const u of uses) assert.match(u, /^actions\/[a-z-]+@[0-9a-f]{40}$/, u);
  assert.equal((code.match(/persist-credentials: false/g) || []).length, (code.match(/actions\/checkout@/g) || []).length);
  assert.match(code, /node-version: 22/);
  assert.match(code, /cache-dependency-path: coro-client-portal\/package-lock\.json/);
  assert.match(code, /run: npm ci\n/);
  assert.ok(fs.existsSync(path.join(root, 'coro-client-portal', 'package-lock.json')));
});

test('contrôles obligatoires présents et scripts existants ; build sans jeton', () => {
  for (const needed of ['npx tsc --noEmit', 'npm run test:skin', 'npm run test:sentinelle-auth', 'npm run test:population-sharing', 'npm run test:bookings', 'npm run build', 'node --test ops/deploy/glass-preview-token.test.mjs']) assert.ok(code.includes(needed), needed);
  for (const n of [...code.matchAll(/npm run ([\w:-]+)/g)].map((m) => m[1])) assert.ok(n === 'build' ? pkg.scripts.build : pkg.scripts[n], `script absent : ${n}`);
});
