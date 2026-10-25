import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { DOMParser } from '@xmldom/xmldom';
import { GET } from '../app/blog/feed.xml/route.ts';
import { feedUrl, generateBlogRss, type PublicBlogFeedPost } from '../lib/site/rss.ts';

const post: PublicBlogFeedPost = {
  id: 'post-stable-id',
  slug: 'securite-et-resilience',
  titleFr: 'Sécurité & résilience <au Québec>',
  titleEn: 'Safety & resilience',
  excerptFr: 'Guide pour les équipes d’intervention.',
  excerptEn: 'A guide for response teams.',
  contentFr: '<p>Contenu français publié.</p>',
  contentEn: '<p>Published English content.</p>',
  coverImage: '/images/blog/guide.jpg',
  category: 'Guides & conseils',
  authorName: 'Équipe CORO',
  authorTitle: 'Résilience',
  publishedAt: '2026-10-24T14:00:00.000Z',
  updatedAt: '2026-10-25T15:30:00.000Z',
};

function parse(xml: string): Document {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  assert.equal(document.getElementsByTagName('parsererror').length, 0, 'RSS must be well-formed XML');
  return document as unknown as Document;
}

test('generates valid RSS 2.0 with escaped accents/content and canonical absolute links', () => {
  const xml = generateBlogRss([post], 'fr', new Date('2026-10-25T16:00:00.000Z'));
  const document = parse(xml);

  assert.equal(document.documentElement.getAttribute('version'), '2.0');
  assert.equal(document.getElementsByTagName('item').length, 1);
  assert.equal(document.getElementsByTagName('title')[1].textContent, post.titleFr);
  assert.equal(document.getElementsByTagName('link')[1].textContent, 'https://getcoro.io/blog/securite-et-resilience');
  assert.match(xml, /Sat, 24 Oct 2026 14:00:00 GMT/);
  assert.match(xml, /urn:coro:blog:post-stable-id:fr/);
  assert.match(xml, /media:content url="https:\/\/getcoro\.io\/images\/blog\/guide\.jpg"/);
});

test('English feed is strict and excludes posts without a real published translation', () => {
  const frenchOnly = { ...post, id: 'fr-only', titleEn: '', contentEn: '' };
  const xml = generateBlogRss([frenchOnly, post], 'en');
  const document = parse(xml);

  assert.equal(document.getElementsByTagName('item').length, 1);
  assert.equal(document.getElementsByTagName('title')[1].textContent, post.titleEn);
  assert.equal(document.getElementsByTagName('link')[1].textContent, 'https://getcoro.io/blog/securite-et-resilience?lang=en');
  assert.equal(feedUrl('en'), 'https://getcoro.io/blog/feed.xml?lang=en');
});

test('empty feeds remain valid RSS documents', () => {
  const document = parse(generateBlogRss([], 'fr'));
  assert.equal(document.getElementsByTagName('channel').length, 1);
  assert.equal(document.getElementsByTagName('item').length, 0);
});

test('blog metadata advertises the locale-appropriate RSS feed', () => {
  const page = readFileSync(new URL('../app/blog/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /'application\/rss\+xml'/);
  assert.match(page, /\/blog\/feed\.xml\?lang=en/);
  assert.match(page, /\/blog\/feed\.xml'/);
});

test('route returns RSS content type and filters malformed upstream records', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => new Response(JSON.stringify([post, { id: 'invalid' }]), { status: 200 });

  const response = await GET(new Request('https://getcoro.io/blog/feed.xml'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/rss+xml; charset=utf-8');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  const document = parse(await response.text());
  assert.equal(document.getElementsByTagName('item').length, 1);
});

test('route fails explicitly with a valid empty RSS feed when the CMS is unavailable', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => new Response('unavailable', { status: 503 });

  const response = await GET(new Request('https://getcoro.io/blog/feed.xml?lang=en'));
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('retry-after'), '300');
  const document = parse(await response.text());
  assert.equal(document.getElementsByTagName('item').length, 0);
  assert.equal(document.getElementsByTagName('language')[0].textContent, 'en-CA');
});
