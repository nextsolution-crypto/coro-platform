import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CTASection } from '@/components/conversion/CTASection';
import { PageSection } from '@/components/page/PageSection';
import { V2Shell } from '@/components/site/V2Shell';
import { serverApiUrl } from '@/lib/site/api';
import styles from './page.module.css';

export const revalidate = 0;

const SITE_URL = 'https://getcoro.io';

/**
 * /blog/[slug] (MIG-07B) — dynamic article reshell into V2Shell. API contract (`GET /api/blog/public/:slug`),
 * the strict FR/EN gate (both titleEn AND contentEn required, no soft fallback like the index), the publication
 * gate (`!post.isPublished -> notFound()`), the slug contract, the `dangerouslySetInnerHTML` trust boundary
 * (content field only — see docs/website-v2/05-migration/MIG-07-BLOG-GATE.md §9/§14), SEO/metadata and
 * structured-data field mapping are all preserved exactly from the legacy implementation; only the visual shell
 * changed. See MIG-07-BLOG-GATE.md §34 for the full contract.
 */

/* ═══════════════════════════════════════════
   RÉCUPÉRATION ARTICLE
═══════════════════════════════════════════ */

async function getPost(slug: string) {
  try {
    const res = await fetch(serverApiUrl(`blog/public/${slug}`), { cache: 'no-store' });
    if (!res.ok) return null;
    const text = await res.text();
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/* ═══════════════════════════════════════════
   SEO / METADATA
═══════════════════════════════════════════ */

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { lang: langParam } = await searchParams;
  const post = await getPost(slug);

  if (!post || !post.isPublished) {
    return { title: 'Article introuvable', robots: { index: false, follow: false } };
  }

  const requestedEnglish = langParam === 'en';

  /*
   * Une version anglaise est considérée comme réelle uniquement si l'article possède du contenu anglais.
   * Cela évite de déclarer à Google une version EN qui afficherait simplement le contenu français.
   */
  const hasEnglish = Boolean(post.titleEn?.trim()) && Boolean(post.contentEn?.trim());
  const isEnglish = requestedEnglish && hasEnglish;

  const frUrl = `${SITE_URL}/blog/${slug}`;
  const enUrl = `${SITE_URL}/blog/${slug}?lang=en`;
  const currentUrl = isEnglish ? enUrl : frUrl;

  const title = isEnglish
    ? post.seoTitleEn || post.titleEn || post.seoTitleFr || post.titleFr
    : post.seoTitleFr || post.titleFr;

  const description = isEnglish ? post.seoDescEn || post.seoDescFr || '' : post.seoDescFr || '';

  return {
    title: `${title} | Blogue CORO`,
    description,
    alternates: {
      canonical: currentUrl,
      languages: hasEnglish
        ? { 'fr-CA': frUrl, 'en-CA': enUrl, 'x-default': frUrl }
        : { 'fr-CA': frUrl, 'x-default': frUrl },
    },
    openGraph: {
      title,
      description,
      url: currentUrl,
      siteName: 'CORO',
      locale: isEnglish ? 'en_CA' : 'fr_CA',
      ...(hasEnglish && { alternateLocale: [isEnglish ? 'fr_CA' : 'en_CA'] }),
      type: 'article',
      publishedTime: post.publishedAt || undefined,
      modifiedTime: post.updatedAt || undefined,
      authors: [SITE_URL],
      ...(post.coverImage && { images: [{ url: post.coverImage, width: 1200, height: 630, alt: title }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(post.coverImage && { images: [post.coverImage] }),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 },
    },
  };
}

/* ═══════════════════════════════════════════
   COULEURS CATÉGORIES
═══════════════════════════════════════════ */

const CATEGORY_COLORS: Record<string, string> = {
  'Réglementation & Normes': '#2980B9',
  'Bonnes pratiques terrain': '#27AE60',
  'Guides pratiques': '#8E44AD',
  'Nouvelles CORO': '#C0392B',
  'Études de cas': '#E67E22',
};

/* ═══════════════════════════════════════════
   PAGE ARTICLE
═══════════════════════════════════════════ */

export default async function BlogPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { slug } = await params;
  const { lang: langParam } = await searchParams;
  const post = await getPost(slug);

  if (!post || !post.isPublished) {
    notFound();
  }

  const hasEnglish = Boolean(post.titleEn?.trim()) && Boolean(post.contentEn?.trim());

  /* Si ?lang=en est demandé mais que la traduction n'existe pas, on affiche la version française. */
  const lang: 'fr' | 'en' = langParam === 'en' && hasEnglish ? 'en' : 'fr';

  const frUrl = `${SITE_URL}/blog/${slug}`;
  const enUrl = `${SITE_URL}/blog/${slug}?lang=en`;
  const currentUrl = lang === 'en' ? enUrl : frUrl;

  const title = lang === 'fr' ? post.titleFr : post.titleEn;
  const content = lang === 'fr' ? post.contentFr : post.contentEn;

  const categoryColor = CATEGORY_COLORS[post.category] || '#6C757D';

  const date = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  const updatedDate = post.updatedAt
    ? new Date(post.updatedAt).toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  const hasUpdate = Boolean(post.updatedAt) && post.updatedAt !== post.publishedAt;

  /* ═══════════════════════════════════════
     JSON-LD ARTICLE
  ═══════════════════════════════════════ */

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: lang === 'fr' ? post.seoDescFr : post.seoDescEn || post.seoDescFr,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { '@type': 'Organization', name: 'Équipe CORO', url: SITE_URL },
    publisher: { '@type': 'Organization', name: 'CORO', url: SITE_URL, logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` } },
    ...(post.coverImage && { image: { '@type': 'ImageObject', url: post.coverImage, width: 1200, height: 630 } }),
    url: currentUrl,
    mainEntityOfPage: { '@type': 'WebPage', '@id': currentUrl },
    inLanguage: lang === 'fr' ? 'fr-CA' : 'en-CA',
    keywords: post.tags?.join(', ') || '',
  };

  /* ═══════════════════════════════════════
     JSON-LD BREADCRUMB
  ═══════════════════════════════════════ */

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: lang === 'fr' ? 'Accueil' : 'Home', item: lang === 'fr' ? SITE_URL : `${SITE_URL}?lang=en` },
      { '@type': 'ListItem', position: 2, name: lang === 'fr' ? 'Blogue' : 'Blog', item: lang === 'fr' ? `${SITE_URL}/blog` : `${SITE_URL}/blog?lang=en` },
      { '@type': 'ListItem', position: 3, name: title, item: currentUrl },
    ],
  };

  const blogHref = `/blog${lang === 'en' ? '?lang=en' : ''}`;

  return (
    <V2Shell locale={lang} pathname={`/blog/${slug}`} englishAvailable={hasEnglish}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <PageSection tone="navy" density="compact" labelledBy="article-title">
        <p className={styles.breadcrumb}>
          <a href={blogHref} className={styles.breadcrumbLink}>{lang === 'fr' ? 'Blogue' : 'Blog'}</a>
          {' / '}
          <span className={styles.breadcrumbCurrent}>{title}</span>
        </p>

        <div className={styles.meta}>
          {post.category && (
            <a
              href={`/blog?category=${encodeURIComponent(post.category)}${lang === 'en' ? '&lang=en' : ''}`}
              className={styles.badge}
              style={{ backgroundColor: categoryColor }}
            >
              {post.category}
            </a>
          )}
          {date && <span className={styles.date}>{date}</span>}
        </div>

        <h1 id="article-title" className={styles.title}>{title}</h1>

        <div className={styles.byline}>
          {(post.authorName || post.authorTitle) && (
            <span className={styles.author}>{[post.authorName, post.authorTitle].filter(Boolean).join(' · ')}</span>
          )}
          {hasUpdate && (
            <span className={styles.updated}>{lang === 'fr' ? `Mis à jour le ${updatedDate}` : `Updated ${updatedDate}`}</span>
          )}
        </div>
      </PageSection>

      {post.coverImage && (
        <div className={styles.heroImageWrap}>
          <img src={post.coverImage} alt={title} className={styles.heroImage} />
        </div>
      )}

      <PageSection tone="white">
        <div className={styles.readingColumn}>
          <article className={styles.body} dangerouslySetInnerHTML={{ __html: content }} />

          {post.tags?.length > 0 && (
            <div className={styles.tags}>
              {post.tags.map((tag: string) => (
                <a key={tag} href={`/blog?tag=${encodeURIComponent(tag)}${lang === 'en' ? '&lang=en' : ''}`} className={styles.tag}>
                  #{tag}
                </a>
              ))}
            </div>
          )}

          <p className={styles.published}>
            {lang === 'fr'
              ? `Publié le ${date}${hasUpdate ? ` · Mis à jour le ${updatedDate}` : ''}`
              : `Published ${date}${hasUpdate ? ` · Updated ${updatedDate}` : ''}`}
          </p>

          <p style={{ marginTop: 'var(--coro-v1-space-4)' }}>
            <a href={blogHref} className={styles.backLink}>{lang === 'fr' ? '← Retour au blogue' : '← Back to blog'}</a>
          </p>
        </div>
      </PageSection>

      <CTASection
        id="article-cta"
        tone="dark"
        label={lang === 'fr' ? 'CORO' : 'CORO'}
        statement={lang === 'fr' ? 'Prêt à moderniser votre pratique ?' : 'Ready to modernize your practice?'}
        support={lang === 'fr' ? 'CORO génère vos documents de conformité en quelques clics.' : 'CORO generates your compliance documents in a few clicks.'}
        primary={{ label: lang === 'fr' ? 'Demander une démo →' : 'Request a demo →', href: lang === 'fr' ? '/#demo' : '/?lang=en#demo' }}
      />
    </V2Shell>
  );
}
