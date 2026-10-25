import { serverApiUrl } from '../../../lib/site/api.ts';
import { generateBlogRss, isPublicBlogFeedPost, type FeedLocale } from '../../../lib/site/rss.ts';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const locale: FeedLocale = new URL(request.url).searchParams.get('lang') === 'en' ? 'en' : 'fr';

  try {
    const upstream = await fetch(serverApiUrl('blog/public/feed'), { cache: 'no-store' });
    if (!upstream.ok) throw new Error(`Blog feed source returned ${upstream.status}`);
    const payload: unknown = await upstream.json();
    if (!Array.isArray(payload)) throw new Error('Blog feed source returned an invalid payload');

    const posts = payload.filter(isPublicBlogFeedPost);
    return new Response(generateBlogRss(posts, locale), {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=0, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response(generateBlogRss([], locale), {
      status: 503,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'no-store',
        'Retry-After': '300',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }
}
