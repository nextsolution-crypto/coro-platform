import { Metadata } from 'next';

export const revalidate = 0;
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.getcoro.io/api';

export const metadata: Metadata = {
  title: 'Blogue CORO — Conformité, sécurité et mesures d\'urgence',
  description: 'Articles et guides pratiques sur la conformité documentaire, les plans de mesures d\'urgence, la sécurité incendie et la réglementation au Québec et au Canada.',
  alternates: { canonical: 'https://getcoro.io/blog' },
  openGraph: {
    title: 'Blogue CORO',
    description: 'Guides pratiques sur la conformité et la sécurité au Canada.',
    url: 'https://getcoro.io/blog',
    siteName: 'CORO',
    locale: 'fr_CA',
    type: 'website',
  },
};

async function getPosts() {
  try {
    const res = await fetch(`${API_URL}/blog/public`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

const CATEGORY_COLORS: Record<string, string> = {
  'Réglementation & Normes': '#2980B9',
  'Bonnes pratiques terrain': '#27AE60',
  'Guides pratiques': '#8E44AD',
  'Nouvelles CORO': '#C0392B',
  'Études de cas': '#E67E22',
};

export default async function BlogPage({ searchParams }: { searchParams: { lang?: string } }) {
  const posts = await getPosts();
  const lang = searchParams?.lang === 'en' ? 'en' : 'fr';

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#F8F9FA', minHeight: '100vh' }}>

      {/* Nav simple */}
      <nav style={{ backgroundColor: '#2C3E50', padding: '0 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <a href={lang === 'en' ? '/?lang=en' : '/'} style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: 24, fontWeight: 900, color: '#FFFFFF', letterSpacing: '-1px' }}>
              CO<span style={{ color: '#C0392B' }}>RO</span>
            </span>
          </a>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <a href={lang === 'en' ? '/?lang=en' : '/'} style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, textDecoration: 'none' }}>
              {lang === 'fr' ? '← Accueil' : '← Home'}
            </a>
            <a href={lang === 'fr' ? '/blog?lang=en' : '/blog'} style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: 4 }}>
              {lang === 'fr' ? 'EN' : 'FR'}
            </a>
          </div>
        </div>
      </nav>

      {/* Header */}
      <div style={{ backgroundColor: '#2C3E50', padding: '60px 24px 80px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#C0392B', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 16 }}>
            {lang === 'fr' ? 'Blogue' : 'Blog'}
          </p>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 900, color: '#FFFFFF', lineHeight: 1.1, marginBottom: 20 }}>
            {lang === 'fr' ? 'Ressources & Guides' : 'Resources & Guides'}
          </h1>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, maxWidth: 600, margin: '0 auto' }}>
            {lang === 'fr'
              ? 'Tout ce que vous devez savoir sur la conformité documentaire, les plans d\'urgence et la réglementation au Canada.'
              : 'Everything you need to know about document compliance, emergency plans and regulations in Canada.'}
          </p>
        </div>
      </div>

      {/* Contenu */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 24px' }}>
        {posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ fontSize: 18, color: '#ADB5BD' }}>
              {lang === 'fr' ? 'Aucun article pour l\'instant. Revenez bientôt !' : 'No articles yet. Check back soon!'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))', gap: 32 }}>
            {posts.map((post: any) => {
              const title = lang === 'fr' ? post.titleFr : (post.titleEn || post.titleFr);
              const excerpt = lang === 'fr' ? post.excerptFr : (post.excerptEn || post.excerptFr);
              const categoryColor = CATEGORY_COLORS[post.category] || '#6C757D';
              const date = post.publishedAt ? new Date(post.publishedAt).toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

              return (
                <a key={post.id} href={`/blog/${post.slug}${lang === 'en' ? '?lang=en' : ''}`}
                  style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', borderRadius: 12, overflow: 'hidden', backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF', transition: 'transform 0.2s, box-shadow 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>

                  {/* Image */}
                  {post.coverImage ? (
                    <div style={{ height: 200, overflow: 'hidden' }}>
                      <img src={post.coverImage} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ) : (
                    <div style={{ height: 200, backgroundColor: '#F8F9FA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 48 }}>📄</span>
                    </div>
                  )}

                  {/* Contenu */}
                  <div style={{ padding: 28, flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {post.category && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#FFFFFF', backgroundColor: categoryColor, padding: '2px 8px', borderRadius: 4 }}>
                          {post.category}
                        </span>
                      )}
                      {date && (
                        <span style={{ fontSize: 12, color: '#ADB5BD' }}>{date}</span>
                      )}
                    </div>
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: '#2C3E50', lineHeight: 1.3, margin: 0 }}>
                      {title}
                    </h2>
                    {excerpt && (
                      <p style={{ fontSize: 14, color: '#6C757D', lineHeight: 1.6, margin: 0 }}>
                        {excerpt}
                      </p>
                    )}
                    <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#C0392B' }}>
                        {lang === 'fr' ? 'Lire l\'article →' : 'Read article →'}
                      </span>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer simple */}
      <div style={{ backgroundColor: '#2C3E50', padding: '32px 24px', textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
          © 2026 CORO — <a href="https://getcoro.io" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>getcoro.io</a>
        </p>
      </div>
    </div>
  );
}