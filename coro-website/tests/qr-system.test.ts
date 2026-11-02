import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import { GET, HEAD } from '../app/qr/[slug]/route.ts';

const expected = 'https://getcoro.io/qr/contact';
test('the print PNG decodes to the permanent contact URL', () => {
  const png = PNG.sync.read(fs.readFileSync(new URL('../public/qr/contact.png', import.meta.url)));
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  assert.equal(decoded?.data, expected); assert.equal(png.width, 2048); assert.equal(png.height, 2048);
});
test('the SVG is vector, monochrome and keeps a four-module quiet zone', () => {
  const svg = fs.readFileSync(new URL('../public/qr/contact.svg', import.meta.url), 'utf8');
  const manifest = JSON.parse(fs.readFileSync(new URL('../public/qr/contact.manifest.json', import.meta.url), 'utf8'));
  assert.match(svg, /^<svg[^>]+viewBox=/u); assert.match(svg, /#000000/iu);
  assert.equal(manifest.permanentUrl, expected); assert.equal(manifest.style.quietZoneModules, 4); assert.equal(manifest.style.centerLogo, false);
});
test('GET returns the controlled temporary redirect without caching', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ destinationUrl: 'https://getcoro.io/contact', redirectStatus: 307 }));
  const response = await GET(new Request(expected, { headers: { 'user-agent': 'Mozilla/5.0 Mobile' } }), { params: Promise.resolve({ slug: 'contact' }) });
  assert.equal(response.status, 307); assert.equal(response.headers.get('location'), 'https://getcoro.io/contact'); assert.match(response.headers.get('cache-control') ?? '', /no-store/u);
});
test('HEAD is supported and unsafe destinations fail closed', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ destinationUrl: 'https://evil.example/phish', redirectStatus: 307 }));
  const response = await HEAD(new Request(expected, { method: 'HEAD' }), { params: Promise.resolve({ slug: 'contact' }) });
  assert.equal(response.status, 503);
});
test('ambiguous, credentialed, forbidden-port and looping destinations fail closed', async (t) => {
  const unsafe = [
    'http://getcoro.io/contact',
    'https://user@getcoro.io/contact',
    'https://getcoro.io:444/contact',
    'https://getcoro.io/contact#fragment',
    'https://getcoro.io/%71r/contact',
    'https://getcoro.io/%2571r/contact',
  ];
  for (const destinationUrl of unsafe) {
    t.mock.method(globalThis, 'fetch', async () => Response.json({ destinationUrl, redirectStatus: 307 }));
    const response = await GET(new Request(expected), { params: Promise.resolve({ slug: 'contact' }) });
    assert.equal(response.status, 503, destinationUrl);
    t.mock.restoreAll();
  }
});
test('unknown, disabled and unavailable authority responses remain explicit and non-cacheable', async (t) => {
  for (const [authorityStatus, expectedStatus] of [[404, 404], [410, 410], [500, 503]] as const) {
    t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: authorityStatus }));
    const response = await GET(new Request(expected), { params: Promise.resolve({ slug: 'contact' }) });
    assert.equal(response.status, expectedStatus);
    if (expectedStatus === 503) assert.match(response.headers.get('cache-control') ?? '', /no-store/u);
    t.mock.restoreAll();
  }
});
test('an invalid public slug never reaches the authority', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new Error('must not run'); });
  const response = await GET(new Request('https://getcoro.io/qr/invalid'), { params: Promise.resolve({ slug: '../admin' }) });
  assert.equal(response.status, 404);
  assert.equal(fetch.mock.callCount(), 0);
});
