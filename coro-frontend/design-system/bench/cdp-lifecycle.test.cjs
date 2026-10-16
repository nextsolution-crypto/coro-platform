/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Cycle de vie des profils et processus Chrome du banc (cdp.cjs) : réussite, échec, interruption, sortie brutale.
 * Chaque cas lance un processus Node enfant qui pilote un vrai Chrome ; on vérifie ensuite que le profil a disparu et
 * qu'aucun processus Chrome n'utilise encore ce profil. Les profils sont créés dans un dossier d'essai dédié (BENCH_TMPDIR),
 * jamais dans le dossier temporaire partagé. Sans Chrome installé, les cas sont ignorés.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const hasChrome = fs.existsSync(CHROME);
const CDP = path.join(__dirname, 'cdp.cjs').split('\\').join('/');
const sandbox = fs.mkdtempSync(path.join(process.env.BENCH_TMPDIR || os.tmpdir(), 'cdp-test-'));
test.after(() => { try { fs.rmSync(sandbox, { recursive: true, force: true }); } catch { /* ignoré */ } });

/** Exécute un scénario dans un processus enfant ; le scénario imprime « INFO <json> » avec le dossier et le pid de Chrome. */
function runChild(body, env = {}) {
  const code = `const cdp = require(${JSON.stringify(CDP)});\n(async () => {\n${body}\n})().catch((e) => { console.error(String(e.message || e)); process.exit(3); });`;
  const r = spawnSync(process.execPath, ['-e', code], { encoding: 'utf8', timeout: 90000, env: { ...process.env, BENCH_TMPDIR: sandbox, ...env } });
  const line = (r.stdout || '').split('\n').find((l) => l.startsWith('INFO '));
  const line2 = (r.stdout || '').split('\n').find((l) => l.startsWith('INFO2 '));
  return { status: r.status, stderr: r.stderr || '', info: line ? JSON.parse(line.slice(5)) : null, info2: line2 ? JSON.parse(line2.slice(6)) : null };
}

/** Nombre de processus chrome qui utilisent encore ce profil. */
function chromeUsing(dir) {
  if (process.platform === 'win32') {
    const ps = `(Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -like '*${path.basename(dir)}*' } | Measure-Object).Count`;
    return Number(spawnSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf8' }).stdout.trim() || 0);
  }
  return spawnSync('pgrep', ['-fc', path.basename(dir)], { encoding: 'utf8' }).stdout.trim() * 1 || 0;
}
const settle = () => spawnSync(process.execPath, ['-e', 'setTimeout(()=>{},1500)']);
const opts = { skip: hasChrome ? false : 'Chrome introuvable (CHROME_PATH)' };
const INFO = 'console.log("INFO " + JSON.stringify({ dir: c.dir, pid: c.pid, inSandbox: c.dir.startsWith(process.env.BENCH_TMPDIR) }));';

function assertClean(info) {
  assert.ok(info, 'le scénario doit annoncer le dossier du profil');
  assert.ok(info.inSandbox, 'le profil doit être créé sous BENCH_TMPDIR');
  settle();
  assert.equal(fs.existsSync(info.dir), false, 'le profil doit être supprimé');
  assert.equal(chromeUsing(info.dir), 0, 'aucun processus Chrome ne doit utiliser le profil');
}

test('réussite : close() supprime le profil et arrête tous les processus', opts, () => {
  const r = runChild(`const c = await cdp.launch(); ${INFO} await c.close(); await c.close();`);
  assert.equal(r.status, 0, r.stderr);
  assertClean(r.info);
});

test('session : ouvrir puis fermer un onglet puis close() ne laisse rien', opts, () => {
  const r = runChild(`const c = await cdp.launch(); ${INFO} const s = await cdp.openSession(c.port, { ui: 'legacy', theme: 'SYSTEM', viewport: 1600 }); await s.close(); await c.close();`);
  assert.equal(r.status, 0, r.stderr);
  assertClean(r.info);
});

test('échec : exception non gérée sans close() → nettoyage à la sortie', opts, () => {
  const r = runChild(`const c = await cdp.launch(); ${INFO} throw new Error('échec simulé');`);
  assert.equal(r.status, 3, r.stderr);
  assertClean(r.info);
});

test('échec : process.exit() sans close() → nettoyage à la sortie', opts, () => {
  const r = runChild(`const c = await cdp.launch(); ${INFO} process.exit(7);`);
  assert.equal(r.status, 7, r.stderr);
  assertClean(r.info);
});

test('interruption contrôlée : SIGINT nettoie puis quitte avec le code 130', opts, () => {
  const r = runChild(`const c = await cdp.launch(); ${INFO} process.emit('SIGINT'); await new Promise((r) => setTimeout(r, 20000));`);
  assert.equal(r.status, 130, r.stderr);
  assertClean(r.info);
});

test('interruption contrôlée : SIGTERM nettoie puis quitte avec le code 143', opts, () => {
  const r = runChild(`const c = await cdp.launch(); ${INFO} process.emit('SIGTERM'); await new Promise((r) => setTimeout(r, 20000));`);
  assert.equal(r.status, 143, r.stderr);
  assertClean(r.info);
});

test('plusieurs instances dans le même processus sont toutes nettoyées', opts, () => {
  const r = runChild(`const a = await cdp.launch(); const c = await cdp.launch(); ${INFO} console.log('INFO2 ' + JSON.stringify({ dir: a.dir })); process.exit(0);`);
  assert.equal(r.status, 0, r.stderr);
  assertClean(r.info);
  assert.ok(r.info2 && r.info2.dir !== r.info.dir);
  assertClean({ ...r.info, dir: r.info2.dir });
});

test('Chrome introuvable : launch() échoue vite et ne laisse aucun profil', () => {
  const before = fs.readdirSync(sandbox).filter((n) => n.startsWith('cg-bench-')).length;
  const r = runChild(`await cdp.launch();`, { CHROME_PATH: path.join(sandbox, 'chrome-inexistant.exe') });
  assert.equal(r.status, 3);
  assert.match(r.stderr, /Chrome n'a pas pu démarrer|Chrome n'a pas répondu/);
  assert.equal(fs.readdirSync(sandbox).filter((n) => n.startsWith('cg-bench-')).length, before);
});

test('ne supprime jamais un profil qui n’a pas été créé par l’exécution courante', opts, () => {
  const foreign = path.join(sandbox, 'cg-bench-ETRANG');
  fs.mkdirSync(foreign); fs.writeFileSync(path.join(foreign, 'garde.txt'), 'à conserver');
  const other = path.join(sandbox, 'autre-dossier'); fs.mkdirSync(other); fs.writeFileSync(path.join(other, 'garde.txt'), 'à conserver');
  const r = runChild(`const c = await cdp.launch(); ${INFO} await c.close();`);
  assert.equal(r.status, 0, r.stderr);
  assertClean(r.info);
  assert.equal(fs.readFileSync(path.join(foreign, 'garde.txt'), 'utf8'), 'à conserver');
  assert.equal(fs.readFileSync(path.join(other, 'garde.txt'), 'utf8'), 'à conserver');
});

test('profileBase : BENCH_TMPDIR prioritaire, sinon le dossier temporaire du système', () => {
  const r1 = spawnSync(process.execPath, ['-e', `console.log(require(${JSON.stringify(CDP)}).profileBase())`], { encoding: 'utf8', env: { ...process.env, BENCH_TMPDIR: sandbox } });
  assert.equal(r1.stdout.trim(), sandbox);
  const env2 = { ...process.env }; delete env2.BENCH_TMPDIR;
  const r2 = spawnSync(process.execPath, ['-e', `console.log(require(${JSON.stringify(CDP)}).profileBase())`], { encoding: 'utf8', env: env2 });
  assert.equal(r2.stdout.trim(), os.tmpdir());
});
