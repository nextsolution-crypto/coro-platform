import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('./manual.module.css', import.meta.url), 'utf8');

assert.match(page, /requestAnimationFrame/);
assert.match(page, /document\.getElementById\(id\)\?\.scrollIntoView/);
assert.match(page, /\[100, 300, 700, 1200\]/);
assert.match(page, /retryTimers\.forEach\(clearTimeout\)/);
assert.match(page, /addEventListener\("hashchange"/);
assert.match(page, /addEventListener\("popstate"/);
assert.match(page, /aria-labelledby="manual-contents"/);
assert.match(page, /href=\{`#\$\{article\.id\}`\}/);
assert.match(page, /Réessayer/);
assert.match(css, /scroll-margin-top:100px/);
assert.match(css, /\.contents\{display:grid/);

console.log('client manual navigation contract: PASS');
