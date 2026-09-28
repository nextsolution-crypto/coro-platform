import type { Metadata } from 'next';
import { EditorialHero } from '@/components/page/EditorialHero';
import { PageSection } from '@/components/page/PageSection';
import { V2Shell } from '@/components/site/V2Shell';
import { serverApiUrl } from '@/lib/site/api';
import { localeFromSearchParams, type Locale } from '@/lib/site/locale';
import { paginate, pageNumbers } from '@/lib/site/pagination';
import { buildPageMetadata } from '@/lib/site/seo';
import styles from './page.module.css';

export const revalidate = 0;

/**
 * /blog (MIG-07A) — editorial index reshell into V2Shell. IN SCOPE: this file only.
 * /blog/[slug] (article page) stays legacy (MIG-07B). API contract, FR/EN soft-fallback behavior,
 * empty/error fail-soft behavior and SEO contract are preserved exactly; see
 * docs/website-v2/05-migration/MIG-07-BLOG-GATE.md §33 for the full contract.
 *
 * Pagination (MIG-07A polish): `GET /api/blog/public` has no page/limit/cursor params
 * (findPublished() in coro-backend/src/blog/blog.service.ts returns the full published
 * collection). This is FRONTEND/CLIENT-SIDE slicing of the already-fetched list, not
 * server-side pagination — see NON-BLOCKING PERFORMANCE DEBT in the gate doc.
 * Pure pagination logic lives in lib/site/pagination.ts (PAGE_SIZE, paginate, pageNumbers).
 */

type Post = {
  id: string;
  slug: string;
  titleFr: string;
  titleEn?: string;
  excerptFr?: string;
  excerptEn?: string;
  coverImage?: string;
  category?: string;
  publishedAt?: string;
};

const CATEGORY_COLORS: Record<string, string> = {
  'Réglementation & Normes': '#2980B9',
  'Bonnes pratiques terrain': '#27AE60',
  'Guides pratiques': '#8E44AD',
  'Nouvelles CORO': '#C0392B',
  'Études de cas': '#E67E22',
};

const copy = {
  fr: {
    metaTitle: 'Blogue CORO — Conformité, sécurité et mesures d’urgence',
    metaDescription: 'Articles et guides pratiques sur la conformité documentaire, les plans de mesures d’urgence, la sécurité incendie et la réglementation au Québec et au Canada.',
    label: 'Blogue',
    title: 'Ressources & Guides',
    lead: 'Tout ce que vous devez savoir sur la conformité documentaire, les plans d’urgence et la réglementation au Canada.',
    empty: 'Aucun article pour l’instant. Revenez bientôt !',
    read: 'Lire l’article',
    all: 'Tous les articles',
    paginationLabel: 'Pagination du blogue',
    prev: '← Précédente',
    next: 'Suivante →',
  },
  en: {
    metaTitle: 'CORO Blog — Emergency Management, Compliance and Fire Safety',
    metaDescription: 'Practical articles and guides on emergency response plans, fire safety, document compliance, business continuity and organizational resilience in Canada.',
    label: 'Blog',
    title: 'Resources & Guides',
    lead: 'Everything you need to know about document compliance, emergency plans and regulations in Canada.',
    empty: 'No articles yet. Check back soon!',
    read: 'Read article',
    all: 'All articles',
    paginationLabel: 'Blog pagination',
    prev: '← Previous',
    next: 'Next →',
  },
} as const;

type PageProps = { searchParams?: Promise<{ lang?: string; category?: string; page?: string }> };

async function getPosts(): Promise<Post[]> {
  try {
    const res = await fetch(serverApiUrl('blog/public'), { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const locale = localeFromSearchParams((await searchParams) ?? {});
  const t = copy[locale];
  return buildPageMetadata({ path: '/blog', locale, title: t.metaTitle, description: t.metaDescription, absoluteTitle: true });
}

function articleHref(slug: string, locale: Locale): string {
  return `/blog/${slug}${locale === 'en' ? '?lang=en' : ''}`;
}

function categoryHref(category: string | null, locale: Locale): string {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (locale === 'en') params.set('lang', 'en');
  const qs = params.toString();
  return qs ? `/blog?${qs}` : '/blog';
}

function pageHref(page: number, category: string, locale: Locale): string {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (locale === 'en') params.set('lang', 'en');
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `/blog?${qs}` : '/blog';
}

function postText(post: Post, locale: Locale): { title: string; excerpt: string } {
  const title = locale === 'fr' ? post.titleFr : post.titleEn || post.titleFr;
  const excerpt = (locale === 'fr' ? post.excerptFr : post.excerptEn || post.excerptFr) ?? '';
  return { title, excerpt };
}

function formatDate(publishedAt: string | undefined, locale: Locale): string {
  if (!publishedAt) return '';
  return new Date(publishedAt).toLocaleDateString(locale === 'fr' ? 'fr-CA' : 'en-CA', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default async function BlogPage({ searchParams }: PageProps) {
  const { lang: langParam, category: categoryParam, page: pageParam } = (await searchParams) ?? {};
  const locale: Locale = langParam === 'en' ? 'en' : 'fr';
  const t = copy[locale];
  const posts = await getPosts();
  const activeCategory = categoryParam || '';
  const filteredPosts = activeCategory ? posts.filter((p) => p.category === activeCategory) : posts;
  const categories = Array.from(new Set(posts.map((p) => p.category).filter((c): c is string => Boolean(c))));

  const requestedPage = Number.parseInt(pageParam ?? '1', 10);
  const { pageItems, currentPage, totalPages } = paginate(filteredPosts, requestedPage);
  const isFirstPage = currentPage === 1;
  const featured: Post | undefined = isFirstPage ? pageItems[0] : undefined;
  const rest: Post[] = isFirstPage ? pageItems.slice(1) : pageItems;

  return (
    <V2Shell locale={locale} pathname="/blog">
      <EditorialHero id="blog-title" label={t.label} title={t.title} lead={t.lead} density="compact" />

      {categories.length > 0 && (
        <PageSection tone="white" density="compact">
          <nav className={styles.filters} aria-label={t.all}>
            <a href={categoryHref(null, locale)} className={styles.filterChip} data-active={!activeCategory}>
              {t.all}
            </a>
            {categories.map((category) => (
              <a
                key={category}
                href={categoryHref(category, locale)}
                className={styles.filterChip}
                data-active={activeCategory === category}
                style={activeCategory === category ? { backgroundColor: CATEGORY_COLORS[category] || '#6C757D', color: '#FFFFFF', borderColor: 'transparent' } : undefined}
              >
                {category}
              </a>
            ))}
          </nav>
        </PageSection>
      )}

      <PageSection tone={categories.length > 0 ? 'soft' : 'white'}>
        {filteredPosts.length === 0 ? (
          <p className={styles.empty}>{t.empty}</p>
        ) : (
          <div className={styles.stack}>
            {featured && (
              <a href={articleHref(featured.slug, locale)} hrefLang={locale === 'en' ? 'en-CA' : 'fr-CA'} className={styles.featured}>
                <div className={styles.featuredMedia}>
                  {featured.coverImage ? (
                    <img src={featured.coverImage} alt={postText(featured, locale).title} loading="lazy" className={styles.featuredImg} />
                  ) : (
                    <span aria-hidden="true" className={styles.placeholder}>📄</span>
                  )}
                </div>
                <div className={styles.featuredBody}>
                  <div className={styles.meta}>
                    {featured.category && (
                      <span className={styles.badge} style={{ backgroundColor: CATEGORY_COLORS[featured.category] || '#6C757D' }}>
                        {featured.category}
                      </span>
                    )}
                    {formatDate(featured.publishedAt, locale) && <span className={styles.date}>{formatDate(featured.publishedAt, locale)}</span>}
                  </div>
                  <h2 className={styles.featuredTitle}>{postText(featured, locale).title}</h2>
                  {postText(featured, locale).excerpt && <p className={styles.featuredExcerpt}>{postText(featured, locale).excerpt}</p>}
                  <span className={styles.readLink}>
                    {t.read}
                    <span aria-hidden="true"> →</span>
                  </span>
                </div>
              </a>
            )}

            {rest.length > 0 && (
              <div className={styles.grid}>
                {rest.map((post) => {
                  const { title, excerpt } = postText(post, locale);
                  const date = formatDate(post.publishedAt, locale);
                  return (
                    <a key={post.id} href={articleHref(post.slug, locale)} hrefLang={locale === 'en' ? 'en-CA' : 'fr-CA'} className={styles.card}>
                      <div className={styles.cardMedia}>
                        {post.coverImage ? (
                          <img src={post.coverImage} alt={title || 'Article CORO'} loading="lazy" className={styles.cardImg} />
                        ) : (
                          <span aria-hidden="true" className={styles.placeholder}>📄</span>
                        )}
                      </div>
                      <div className={styles.cardBody}>
                        <div className={styles.meta}>
                          {post.category && (
                            <span className={styles.badge} style={{ backgroundColor: CATEGORY_COLORS[post.category] || '#6C757D' }}>
                              {post.category}
                            </span>
                          )}
                          {date && <span className={styles.date}>{date}</span>}
                        </div>
                        <h3 className={styles.cardTitle}>{title}</h3>
                        {excerpt && <p className={styles.cardExcerpt}>{excerpt}</p>}
                        <span className={styles.readLink}>
                          {t.read}
                          <span aria-hidden="true"> →</span>
                        </span>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}

            {totalPages > 1 && (
              <nav className={styles.pagination} aria-label={t.paginationLabel}>
                {currentPage > 1 && (
                  <a href={pageHref(currentPage - 1, activeCategory, locale)} className={styles.pageLink}>
                    {t.prev}
                  </a>
                )}
                {pageNumbers(currentPage, totalPages).map((p, i) =>
                  p === 'ellipsis' ? (
                    <span key={`ellipsis-${i}`} className={styles.pageEllipsis} aria-hidden="true">…</span>
                  ) : (
                    <a
                      key={p}
                      href={pageHref(p, activeCategory, locale)}
                      className={styles.pageLink}
                      data-active={p === currentPage}
                      aria-current={p === currentPage ? 'page' : undefined}
                    >
                      {p}
                    </a>
                  )
                )}
                {currentPage < totalPages && (
                  <a href={pageHref(currentPage + 1, activeCategory, locale)} className={styles.pageLink}>
                    {t.next}
                  </a>
                )}
              </nav>
            )}
          </div>
        )}
      </PageSection>
    </V2Shell>
  );
}
