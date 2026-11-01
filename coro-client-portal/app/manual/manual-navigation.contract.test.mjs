import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('./manual.module.css', import.meta.url), 'utf8');

assert.match(page, /requestAnimationFrame/);
assert.match(page, /document\.getElementById\(id\)\?\.scrollIntoView/);
assert.match(page, /addEventListener\("hashchange"/);
assert.match(page, /addEventListener\("popstate"/);
assert.doesNotMatch(page, /setTimeout\([^)]*scroll/i);
assert.match(page, /aria-labelledby="manual-contents"/);
assert.match(page, /href=\{`#\$\{article\.id\}`\}/);
assert.match(page, /Réessayer/);
assert.match(css, /scroll-margin-top:100px/);
assert.match(css, /\.contents\{display:grid/);

console.log('client manual navigation contract: PASS');
