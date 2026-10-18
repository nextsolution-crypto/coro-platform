/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Exécute tous les scripts « test:* » des deux applications (coro-frontend et coro-client-portal) et enregistre le résultat.
 *
 *   node design-system/tools/run-validation.cjs --out DIR       → DIR/validation-results.json
 *
 * Sert de preuve fonctionnelle pour la matrice de couverture V2 : une route sensible n'est « validée » que si TOUS les scripts de sa
 * liste `validation` (registre) sont passés. Aucun script n'est affaibli, ignoré ni relancé en cas d'échec. coro-website n'est jamais lancé.
 */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO = path.resolve(__dirname, '..', '..', '..');
const APPS = [{ key: 'app', dir: path.join(REPO, 'coro-frontend') }, { key: 'portal', dir: path.join(REPO, 'coro-client-portal') }];

const out = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : null;
if (!out) { console.error('--out requis'); process.exit(2); }
fs.mkdirSync(out, { recursive: true });

const results = [];
for (const app of APPS) {
  const pkg = JSON.parse(fs.readFileSync(path.join(app.dir, 'package.json'), 'utf8'));
  const scripts = Object.keys(pkg.scripts).filter((k) => /^test:/.test(k));
  for (const script of scripts) {
    const t0 = Date.now();
    const r = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', script], { cwd: app.dir, encoding: 'utf8', shell: process.platform === 'win32', maxBuffer: 64 * 1024 * 1024 });
    const text = (r.stdout || '') + (r.stderr || '');
    const pass = [...text.matchAll(/^# pass (\d+)/gm)].reduce((s, m) => s + Number(m[1]), 0);
    const fail = [...text.matchAll(/^# fail (\d+)/gm)].reduce((s, m) => s + Number(m[1]), 0);
    results.push({ app: app.key, script, exit: r.status, pass, fail, ms: Date.now() - t0 });
    console.log(`${r.status === 0 ? 'ok ' : 'KO '} ${app.key}:${script} (${pass} tests, ${fail} échecs)`);
    if (r.status !== 0) fs.writeFileSync(path.join(out, `${app.key}-${script.replace(/[^a-z0-9]+/gi, '_')}.log`), text);
  }
}
fs.writeFileSync(path.join(out, 'validation-results.json'), JSON.stringify({ at: new Date().toISOString(), results }, null, 2));
const bad = results.filter((r) => r.exit !== 0);
console.log(`\nVALIDATION : ${results.length} scripts, ${results.length - bad.length} passés, ${bad.length} en échec`);
process.exit(bad.length ? 1 : 0);
