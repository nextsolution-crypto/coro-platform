/* eslint-disable @typescript-eslint/no-require-imports */
// Garde-fous des scripts d'acceptation sur le vrai backend : ils refusent la production, le port 3002 et toute cible non locale,
// avant toute requête réseau. Aucune connexion n'est tentée.
const test = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const run = (script, api) => spawnSync(process.execPath, [path.join(__dirname, script)], {
  env: { ...process.env, ACC_API: api, ACC_IDS: 'inexistant.json', ACC_PASSWORD: 'x', ACC_MFA_DIR: 'x', ACC_SESSIONS: 'inexistant.json' },
  encoding: 'utf8',
});
const TARGETS = ['https://api.getcoro.io/api', 'https://app.getcoro.io/api', 'http://localhost:3002/api', 'http://127.0.0.1:3002/api', 'https://exemple.com/api', 'http://10.0.0.5:3052/api'];

for (const script of ['acceptance-real-backend.cjs', 'acceptance-browser-real.cjs']) {
  for (const target of TARGETS) {
    test(`${script} refuse ${target}`, () => {
      const r = run(script, target);
      assert.strictEqual(r.status, 2, r.stdout + r.stderr);
      assert.match(r.stderr, /Refus/);
    });
  }
  test(`${script} exige une cible`, () => {
    const r = run(script, '');
    assert.strictEqual(r.status, 2);
  });
}
