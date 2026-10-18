import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

// Garde du jeton de présentation Liquid Glass V2 (NEXT_PUBLIC_GLASS_BETA=production-preview).
// Ce jeton n'est ni un secret ni un mécanisme d'autorisation : il active seulement les écrans re-teintés dans l'application et le portail.
// Il ne doit être transmis qu'aux deux images Next.js de la release manuelle protégée, jamais ailleurs.
const root = path.resolve(new URL('../..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8').replaceAll('\r\n', '\n');
const TOKEN = 'production-preview';

const deploy = read('.github', 'workflows', 'deploy.yml');

test('le jeton n’est transmis que par la release manuelle protégée, aux images application et portail seulement', () => {
  const occurrences = [...deploy.matchAll(/NEXT_PUBLIC_GLASS_BETA=(\S+)/g)];
  assert.equal(occurrences.length, 2, 'exactement deux arguments de build');
  for (const m of occurrences) assert.equal(m[1], TOKEN, 'valeur exacte attendue');
  const buildJob = deploy.slice(deploy.indexOf('  build-images:'), deploy.indexOf('  production-release:'));
  assert.ok(buildJob.includes("if: github.event_name == 'workflow_dispatch'"), 'build-images exige workflow_dispatch');
  for (const block of buildJob.split('- name: ').filter((b) => b.includes('NEXT_PUBLIC_GLASS_BETA'))) {
    assert.ok(/^Build and push (frontend|client-portal)\n/.test(block), 'jeton réservé aux images frontend et client-portal');
  }
  for (const name of ['backend', 'website']) {
    const block = buildJob.split('- name: ').find((b) => b.startsWith(`Build and push ${name}\n`));
    assert.ok(block && !block.includes('NEXT_PUBLIC_GLASS_BETA'), `l’image ${name} ne reçoit jamais le jeton`);
  }
  // Le job de validation sur push (typecheck, tests, build du portail) construit sans jeton.
  assert.ok(!deploy.slice(0, deploy.indexOf('  build-images:')).includes('NEXT_PUBLIC_GLASS_BETA'));
});

test('les Dockerfile de l’application et du portail déclarent l’argument avec une valeur VIDE par défaut', () => {
  for (const app of ['coro-frontend', 'coro-client-portal']) {
    const df = read(app, 'Dockerfile');
    assert.match(df, /^ARG NEXT_PUBLIC_GLASS_BETA=""$/m, app);
    assert.match(df, /^ENV NEXT_PUBLIC_GLASS_BETA=\$NEXT_PUBLIC_GLASS_BETA$/m, app);
    assert.ok(!df.includes(TOKEN), `${app} : aucune valeur de jeton codée en dur dans le Dockerfile`);
  }
});

test('ni le backend, ni le site vitrine, ni la composition de production ne connaissent le jeton', () => {
  for (const file of [['coro-backend', 'Dockerfile'], ['coro-website', 'Dockerfile'], ['docker-compose.yml']]) {
    assert.ok(!read(...file).includes('GLASS_BETA'), file.join('/'));
  }
  for (const f of fs.readdirSync(path.join(root, '.github', 'workflows'))) {
    if (f === 'deploy.yml') continue;
    assert.ok(!read('.github', 'workflows', f).includes(TOKEN), `${f} : le jeton n’est transmis que par deploy.yml`);
  }
});

test('seules des variables NEXT_PUBLIC_* non secrètes sont fixées au build des deux applications (aucun secret dans les bundles client)', () => {
  for (const app of ['coro-frontend', 'coro-client-portal']) {
    const df = read(app, 'Dockerfile');
    const builder = df.split('AS production')[0];
    const envs = [...builder.matchAll(/^ENV (\w+)=/gm)].map((m) => m[1]);
    for (const e of envs) assert.match(e, /^NEXT_PUBLIC_[A-Z_]+$/, `${app} : variable de build non publique « ${e} »`);
    assert.ok(!/(SECRET|PASSWORD|API_KEY|TOKEN)\b/i.test(builder.replace(/GLASS_BETA/g, '')), `${app} : aucun secret au build`);
  }
  assert.ok(!/(secrets\.[A-Z_]+)/.test(deploy.slice(deploy.indexOf('Build and push frontend'), deploy.indexOf('Build and push website'))), 'aucun secret en argument de build');
});
