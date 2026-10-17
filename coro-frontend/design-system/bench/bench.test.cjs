/* eslint-disable @typescript-eslint/no-require-imports */
// Tests du banc de comparaison lui-même : le moteur de comparaison détecte-t-il réellement une régression ?
// (Un banc qui ne détecte rien serait pire que pas de banc.) Le pilotage du navigateur est exercé par les scénarios.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { compareSnapshots } = require('./cli.cjs');

const PROPS = ['color', 'backgroundColor', 'fontSize', 'display'];
const snap = (els) => ({ props: PROPS, count: els.length, els });
const el = (p, v, c = '') => ({ p, c, x: '', v });

test('banc : deux captures identiques → 0 écart', () => {
  const a = snap([el('html', ['red', 'white', '16px', 'block']), el('body>div[0]', ['blue', 'white', '14px', 'flex'])]);
  const r = compareSnapshots(a, JSON.parse(JSON.stringify(a)), []);
  assert.equal(r.diffs.length + r.missing.length + r.extra.length, 0);
});

test('banc : un changement de couleur, de taille ou de display est détecté et localisé', () => {
  const a = snap([el('body>div[0]', ['rgb(44, 62, 80)', 'white', '14px', 'flex'])]);
  const b = snap([el('body>div[0]', ['rgb(237, 243, 250)', 'white', '15px', 'flex'])]);
  const r = compareSnapshots(a, b, []);
  assert.equal(r.diffs.length, 2);
  assert.deepEqual(r.byProp, { color: 1, fontSize: 1 });
  assert.equal(r.diffs[0].p, 'body>div[0]');
});

test('banc : élément manquant ou ajouté détecté ; propriété ignorée explicitement', () => {
  const a = snap([el('body>div[0]', ['a', 'b', '1px', 'block']), el('body>div[1]', ['a', 'b', '1px', 'block'])]);
  const b = snap([el('body>div[0]', ['a', 'b', '2px', 'block']), el('body>div[2]', ['a', 'b', '1px', 'block'])]);
  const r = compareSnapshots(a, b, ['fontSize']);
  assert.deepEqual(r.missing, ['body>div[1]']); assert.deepEqual(r.extra, ['body>div[2]']); assert.equal(r.diffs.length, 0);
});

test('banc : documentation des limites présente et franche', () => {
  const readme = fs.readFileSync(path.join(__dirname, 'README.md'), 'utf8');
  assert.match(readme, /## Limites/);
  for (const k of ['hash', 'dégradé', 'faux API', 'appareil']) assert.ok(readme.toLowerCase().includes(k.toLowerCase()), 'limite non documentée : ' + k);
});
