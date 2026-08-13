import { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const revalidate = 0;
const API_URL = 'http://coro_backend:3002/api';

async function getPost(slug: string) {
  try {
    const res = await fetch(`${API_URL}/blog/public/${slug}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const text = await res.text();
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ lang?: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { lang: langParam } = await searchParams;
  const post = await getPost(slug);
  if (!post) return { title: 'Article introuvable' };
  const lang = langParam === 'en' ? 'en' : 'fr';
  const title = lang === 'fr' ? (post.seoTitleFr || post.titleFr) : (post.seoTitleEn || post.titleEn || post.titleFr);
  const desc = lang === 'fr' ? post.seoDescFr : (post.seoDescEn || post.seoDescFr);
  return {
    title: `${title} | Blogue CORO`,
    description: desc || '',
    alternates: { canonical: `https://getcoro.io/blog/${slug}` },
    openGraph: {
      title,
      description: desc || '',
      url: `https://getcoro.io/blog/${slug}`,
      siteName: 'CORO',
      locale: lang === 'fr' ? 'fr_CA' : 'en_CA',
      type: 'article',
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: ['https://getcoro.io'],
      ...(post.coverImage && { images: [{ url: post.coverImage, width: 1200, height: 630, alt: title }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc || '',
      ...(post.coverImage && { images: [post.coverImage] }),
    },
  };
}

const CATEGORY_COLORS: Record<string, string> = {
  'Réglementation & Normes': '#2980B9',
  'Bonnes pratiques terrain': '#27AE60',
  'Guides pratiques': '#8E44AD',
  'Nouvelles CORO': '#C0392B',
  'Études de cas': '#E67E22',
};

export default async function BlogPostPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { slug } = await params;
  const { lang: langParam } = await searchParams;
  const post = await getPost(slug);
  if (!post || !post.isPublished) notFound();
  const lang = langParam === 'en' ? 'en' : 'fr';
  const title = lang === 'fr' ? post.titleFr : (post.titleEn || post.titleFr);
  const content = lang === 'fr' ? post.contentFr : (post.contentEn || post.contentFr);
  const categoryColor = CATEGORY_COLORS[post.category] || '#6C757D';
  const date = post.publishedAt ? new Date(post.publishedAt).toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const updatedDate = post.updatedAt ? new Date(post.updatedAt).toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

  // JSON-LD Article
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: lang === 'fr' ? post.seoDescFr : post.seoDescEn,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { '@type': 'Organization', name: 'Équipe CORO', url: 'https://getcoro.io' },
    publisher: {
      '@type': 'Organization',
      name: 'CORO',
      url: 'https://getcoro.io',
      logo: { '@type': 'ImageObject', url: 'https://getcoro.io/logo.png' },
    },
    ...(post.coverImage && { image: { '@type': 'ImageObject', url: post.coverImage, width: 1200, height: 630 } }),
    url: `https://getcoro.io/blog/${slug}`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `https://getcoro.io/blog/${slug}` },
    inLanguage: lang === 'fr' ? 'fr-CA' : 'en-CA',
    keywords: post.tags?.join(', ') || '',
  };

  // JSON-LD BreadcrumbList
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://getcoro.io' },
      { '@type': 'ListItem', position: 2, name: lang === 'fr' ? 'Blogue' : 'Blog', item: 'https://getcoro.io/blog' },
      { '@type': 'ListItem', position: 3, name: title, item: `https://getcoro.io/blog/${slug}` },
    ],
  };

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#F8F9FA', minHeight: '100vh' }}>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      {/* Nav */}
      <nav style={{ backgroundColor: '#2C3E50', padding: '0 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <a href={lang === 'en' ? '/?lang=en' : '/'} style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: 24, fontWeight: 900, color: '#FFFFFF', letterSpacing: '-1px' }}>
              CO<span style={{ color: '#C0392B' }}>RO</span>
            </span>
          </a>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <a href={`/blog${lang === 'en' ? '?lang=en' : ''}`} style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, textDecoration: 'none' }}>
              {lang === 'fr' ? '← Blogue' : '← Blog'}
            </a>
            <a href={lang === 'fr' ? `/blog/${slug}?lang=en` : `/blog/${slug}`}
              style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: 4 }}>
              {lang === 'fr' ? 'EN' : 'FR'}
            </a>
          </div>
        </div>
      </nav>

      {/* Breadcrumb visible */}
      <div style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E9ECEF', padding: '12px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <p style={{ fontSize: 13, color: '#ADB5BD' }}>
            <a href="/" style={{ color: '#ADB5BD', textDecoration: 'none' }}>getcoro.io</a>
            {' '}/{'  '}
            <a href={`/blog${lang === 'en' ? '?lang=en' : ''}`} style={{ color: '#ADB5BD', textDecoration: 'none' }}>
              {lang === 'fr' ? 'Blogue' : 'Blog'}
            </a>
            {' '}/{'  '}
            <span style={{ color: '#6C757D' }}>{title}</span>
          </p>
        </div>
      </div>

      {/* Hero article */}
      <div style={{ backgroundColor: '#2C3E50', padding: '60px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            {post.category && (
              <span style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF', backgroundColor: categoryColor, padding: '3px 10px', borderRadius: 4 }}>
                {post.category}
              </span>
            )}
            {date && <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{date}</span>}
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, color: '#FFFFFF', lineHeight: 1.15, marginBottom: 20 }}>
            {title}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
              {post.authorName} · {post.authorTitle}
            </p>
            {post.updatedAt !== post.publishedAt && (
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                {lang === 'fr' ? `Mis à jour le ${updatedDate}` : `Updated ${updatedDate}`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Image couverture */}
      {post.coverImage && (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ marginTop: -40, borderRadius: 12, overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,0.15)' }}>
            <img src={post.coverImage} alt={title} style={{ width: '100%', height: 400, objectFit: 'cover', display: 'block' }} />
          </div>
        </div>
      )}

      {/* Contenu */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px 80px' }}>
        <div
          style={{ fontSize: 17, lineHeight: 1.8, color: '#2C3E50' }}
          dangerouslySetInnerHTML={{ __html: content }}
        />

        {/* Tags */}
        {post.tags?.length > 0 && (
          <div style={{ marginTop: 48, paddingTop: 32, borderTop: '1px solid #E9ECEF', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {post.tags.map((tag: string) => (
              <span key={tag} style={{ fontSize: 12, fontWeight: 600, color: '#6C757D', backgroundColor: '#F8F9FA', border: '1px solid #DEE2E6', padding: '4px 10px', borderRadius: 20 }}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Date mise à jour */}
        <p style={{ marginTop: 24, fontSize: 12, color: '#ADB5BD' }}>
          {lang === 'fr'
            ? `Publié le ${date}${post.updatedAt !== post.publishedAt ? ` · Mis à jour le ${updatedDate}` : ''}`
            : `Published ${date}${post.updatedAt !== post.publishedAt ? ` · Updated ${updatedDate}` : ''}`}
        </p>

        {/* CTA */}
        <div style={{ marginTop: 64, backgroundColor: '#2C3E50', borderRadius: 12, padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 22, fontWeight: 800, color: '#FFFFFF', marginBottom: 12 }}>
            {lang === 'fr' ? 'Prêt à moderniser votre pratique ?' : 'Ready to modernize your practice?'}
          </p>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', marginBottom: 24 }}>
            {lang === 'fr' ? 'CORO génère vos documents de conformité en quelques clics.' : 'CORO generates your compliance documents in a few clicks.'}
          </p>
          <a href={lang === 'fr' ? '/#demo' : '/?lang=en#demo'}
            style={{ display: 'inline-block', backgroundColor: '#C0392B', color: '#FFFFFF', padding: '14px 32px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 15 }}>
            {lang === 'fr' ? 'Demander une démo →' : 'Request a demo →'}
          </a>
        </div>
      </div>

      {/* Footer */}
      <div style={{ backgroundColor: '#2C3E50', padding: '32px 24px', textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
          © 2026 CORO — <a href="https://getcoro.io" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>getcoro.io</a>
        </p>
      </div>
    </div>
  );
}