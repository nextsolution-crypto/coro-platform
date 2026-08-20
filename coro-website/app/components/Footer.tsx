'use client';

import { useState, useEffect } from 'react';

const translations = {
  fr: {
    footer: {
      tagline: 'Plateforme SaaS canadienne pour la conformité opérationnelle et la résilience organisationnelle.',
      product: 'Produit',
      legal: 'Légal',
      rights: '© 2026 GetCoro Solutions Inc. Tous droits réservés.',
      hosting: 'Hébergé au Canada 🇨🇦',
      links: {
        features: 'Fonctionnalités',
        pricing: 'Tarification',
        login: 'Connexion conseiller',
        clientPortal: 'Portail client',
        privacy: 'Politique de confidentialité',
        terms: "Conditions d'utilisation",
      },
    },
  },
  en: {
    footer: {
      tagline: 'Canadian SaaS platform for operational compliance and organizational resilience.',
      product: 'Product',
      legal: 'Legal',
      rights: '© 2026 GetCoro Solutions Inc. All rights reserved.',
      hosting: 'Hosted in Canada 🇨🇦',
      links: {
        features: 'Features',
        pricing: 'Pricing',
        login: 'Advisor login',
        clientPortal: 'Client portal',
        privacy: 'Privacy Policy',
        terms: 'Terms of Service',
      },
    },
  },
};

export default function Footer() {
  const [lang, setLang] = useState<'fr' | 'en'>('fr');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('lang') === 'en') setLang('en');
  }, []);

  const toggleLanguage = () => {
    const newLang = lang === 'fr' ? 'en' : 'fr';
    setLang(newLang);
    const url = new URL(window.location.href);
    if (newLang === 'en') {
      url.searchParams.set('lang', 'en');
    } else {
      url.searchParams.delete('lang');
    }
    window.history.pushState({}, '', url.toString());
  };

  const t = translations[lang];

  return (
    <footer style={{ backgroundColor: '#1A252F', padding: '56px 24px 32px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* LOGO */}
        <div style={{ marginBottom: 52 }}>
          <div style={{ marginBottom: 8 }}>
            <span
              style={{ fontSize: 28, fontWeight: 900, color: '#FFFFFF', letterSpacing: '-1px', cursor: 'pointer' }}
              onClick={() => { window.location.href = lang === 'fr' ? '/' : '/?lang=en'; }}>
              CO<span style={{ color: '#C0392B' }}>RO</span>
            </span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 12, lineHeight: 1.7, maxWidth: 280 }}>
            {t.footer.tagline}
          </p>
        </div>

        {/* COLONNES */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 48, marginBottom: 72, alignItems: 'start' }}>

          {/* CANADA */}
          <div>
            <h4 style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 700, margin: '0 0 20px 0', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              🇨🇦 Canada
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 1.75, margin: 0 }}>
                2879 Boul. Pierre-Bernard<br />
                Montréal (QC), H1L 4R2<br />
                Canada
              </p>
              <a href="mailto:info@getcoro.io"
                style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, textDecoration: 'none', marginTop: 12 }}
                onMouseEnter={e => { e.currentTarget.style.color = '#FFFFFF'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}>
                info@getcoro.io
              </a>
              <a href="tel:+15147917871"
                style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, textDecoration: 'none' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#FFFFFF'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}>
                +1 (514) 791-7871
              </a>
            </div>
          </div>

          {/* PRODUIT */}
          <div>
            <h4 style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 700, margin: '0 0 20px 0', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {t.footer.product}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <a href="/#features"
                style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, textDecoration: 'none' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#FFFFFF'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}>
                {t.footer.links.features}
              </a>
              <a href="/#pricing"
                style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, textDecoration: 'none' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#FFFFFF'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}>
                {t.footer.links.pricing}
              </a>
              <a href="https://getcoro.io/#documents"
                style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, textDecoration: 'none' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#FFFFFF'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}>
                {lang === 'fr' ? 'Documents' : 'Documents'}
              </a>
              <a href="https://app.getcoro.io/login"
                style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, textDecoration: 'none' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#FFFFFF'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}>
                {t.footer.links.login}
              </a>
              <a href="https://client.getcoro.io/login"
                style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, textDecoration: 'none' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#FFFFFF'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}>
                {t.footer.links.clientPortal}
              </a>
            </div>
          </div>

          {/* COMPAGNIE */}
          <div>
            <h4 style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 700, margin: '0 0 20px 0', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {lang === 'fr' ? 'Compagnie' : 'Company'}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { id: 'about', label: lang === 'fr' ? 'À propos' : 'About us', href: lang === 'fr' ? '/about' : '/about?lang=en', soon: false },
                { id: 'security', label: lang === 'fr' ? 'Sécurité' : 'Security', href: lang === 'fr' ? '/security' : '/security?lang=en', soon: false },
                { id: 'blog', label: lang === 'fr' ? 'Blogue' : 'Blog', href: '/blog', soon: false },
                { id: 'partners', label: lang === 'fr' ? 'Partenaires' : 'Partners', href: '/partners', soon: true },
                { id: 'contact', label: lang === 'fr' ? 'Nous contacter' : 'Contact us', href: '/#demo', soon: false },
              ].map(link => (
                <div key={link.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <a href={link.href}
                    style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, textDecoration: 'none' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#FFFFFF'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}>
                    {link.label}
                  </a>
                  {link.soon && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#F39C12', backgroundColor: 'rgba(243,156,18,0.15)', border: '1px solid rgba(243,156,18,0.3)', padding: '1px 6px', borderRadius: 4 }}>
                      {lang === 'fr' ? 'Bientôt' : 'Soon'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* LÉGAL */}
          <div>
            <h4 style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 700, margin: '0 0 20px 0', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {t.footer.legal}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { id: 'privacy', label: t.footer.links.privacy, href: lang === 'fr' ? '/privacy' : '/privacy?lang=en' },
                { id: 'terms', label: t.footer.links.terms, href: lang === 'fr' ? '/terms' : '/terms?lang=en' },
              ].map(link => (
                <a key={link.id} href={link.href}
                  style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, textDecoration: 'none' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#FFFFFF'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}>
                  {link.label}
                </a>
              ))}
            </div>
          </div>

        </div>

        {/* BAS DU FOOTER */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, margin: 0 }}>{t.footer.rights}</p>
              <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
              <a href={lang === 'fr' ? '/privacy' : '/privacy?lang=en'}
                style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, textDecoration: 'none' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#FFFFFF'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}>
                {t.footer.links.privacy}
              </a>
              <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
              <a href={lang === 'fr' ? '/terms' : '/terms?lang=en'}
                style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, textDecoration: 'none' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#FFFFFF'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}>
                {t.footer.links.terms}
              </a>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, margin: 0 }}>{t.footer.hosting}</p>
              <button
                onClick={toggleLanguage}
                style={{ padding: '7px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, border: '1px solid rgba(255,255,255,0.15)', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#FFFFFF'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}>
                {lang === 'fr' ? '🌐 English' : '🌐 Français'}
              </button>
            </div>

          </div>
        </div>

      </div>
    </footer>
  );
}