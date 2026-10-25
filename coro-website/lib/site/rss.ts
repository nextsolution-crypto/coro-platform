import { SITE_URL } from './seo.ts';

export type FeedLocale = 'fr' | 'en';

export type PublicBlogFeedPost = {
  id: string;
  slug: string;
  titleFr: string;
  titleEn?: string | null;
  excerptFr?: string | null;
  excerptEn?: string | null;
  contentFr: string;
  contentEn?: string | null;
  coverImage?: string | null;
  category?: string | null;
  authorName?: string | null;
  authorTitle?: string | null;
  publishedAt: string;
  updatedAt?: string | null;
};

const copy = {
  fr: {
    title: 'Blogue CORO',
    description: 'Articles et guides CORO sur la conformité, la sécurité et la résilience organisationnelle.',
    language: 'fr-CA',
  },
  en: {
    title: 'CORO Blog',
    description: 'CORO articles and guides on compliance, safety and organizational resilience.',
    language: 'en-CA',
  },
} as const;

export function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function clean(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

function validDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function articleUrl(slug: string, locale: FeedLocale): string {
  const url = new URL(`/blog/${encodeURIComponent(slug)}`, SITE_URL);
  if (locale === 'en') url.searchParams.set('lang', 'en');
  return url.toString();
}

export function feedUrl(locale: FeedLocale): string {
  const url = new URL('/blog/feed.xml', SITE_URL);
  if (locale === 'en') url.searchParams.set('lang', 'en');
  return url.toString();
}

function publicImageUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, SITE_URL);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function localizedPost(post: PublicBlogFeedPost, locale: FeedLocale) {
  const title = clean(locale === 'fr' ? post.titleFr : post.titleEn);
  const content = clean(locale === 'fr' ? post.contentFr : post.contentEn);
  if (!title || !content) return null;

  return {
    title,
    excerpt: clean(locale === 'fr' ? post.excerptFr : post.excerptEn),
  };
}

export function generateBlogRss(posts: PublicBlogFeedPost[], locale: FeedLocale, generatedAt = new Date()): string {
  const t = copy[locale];
  const items = posts.flatMap((post) => {
    const localized = localizedPost(post, locale);
    const publishedAt = validDate(post.publishedAt);
    if (!localized || !publishedAt) return [];

    const link = articleUrl(post.slug, locale);
    const updatedAt = validDate(post.updatedAt);
    const image = publicImageUrl(post.coverImage);
    const author = clean(post.authorName);
    const authorTitle = clean(post.authorTitle);
    const category = clean(post.category);
    const creator = authorTitle ? `${author} — ${authorTitle}` : author;

    return [
      '    <item>',
      `      <title>${escapeXml(localized.title)}</title>`,
      `      <link>${escapeXml(link)}</link>`,
      `      <guid isPermaLink="false">${escapeXml(`urn:coro:blog:${post.id}:${locale}`)}</guid>`,
      localized.excerpt ? `      <description>${escapeXml(localized.excerpt)}</description>` : '',
      `      <pubDate>${publishedAt.toUTCString()}</pubDate>`,
      updatedAt ? `      <atom:updated>${updatedAt.toISOString()}</atom:updated>` : '',
      creator ? `      <dc:creator>${escapeXml(creator)}</dc:creator>` : '',
      category ? `      <category>${escapeXml(category)}</category>` : '',
      `      <dc:language>${t.language}</dc:language>`,
      image ? `      <media:content url="${escapeXml(image)}" medium="image" />` : '',
      '    </item>',
    ].filter(Boolean).join('\n');
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">',
    '  <channel>',
    `    <title>${escapeXml(t.title)}</title>`,
    `    <link>${SITE_URL}/blog${locale === 'en' ? '?lang=en' : ''}</link>`,
    `    <description>${escapeXml(t.description)}</description>`,
    `    <language>${t.language}</language>`,
    `    <lastBuildDate>${generatedAt.toUTCString()}</lastBuildDate>`,
    `    <atom:link href="${escapeXml(feedUrl(locale))}" rel="self" type="application/rss+xml" />`,
    ...items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
}

export function isPublicBlogFeedPost(value: unknown): value is PublicBlogFeedPost {
  if (!value || typeof value !== 'object') return false;
  const post = value as Record<string, unknown>;
  return ['id', 'slug', 'titleFr', 'contentFr', 'publishedAt'].every((field) => typeof post[field] === 'string');
}
