'use client';

import { useEffect, useState } from 'react';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [lang, setLang] = useState<'fr' | 'en'>('fr');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get('lang') === 'en') {
      setLang('en');
    }

    const acknowledged = localStorage.getItem(
      'coro_cookie_notice_acknowledged'
    );

    if (!acknowledged) {
      setVisible(true);
    }
  }, []);

  const acknowledge = () => {
    localStorage.setItem(
      'coro_cookie_notice_acknowledged',
      'true'
    );

    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label={
        lang === 'fr'
          ? 'Information sur les témoins'
          : 'Cookie information'
      }
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: '#1A252F',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        padding: '18px 24px',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.12)',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        {/* Texte */}
        <div
          style={{
            flex: 1,
            minWidth: 280,
          }}
        >
          <p
            style={{
              color: '#FFFFFF',
              fontSize: 14,
              fontWeight: 600,
              margin: '0 0 4px 0',
            }}
          >
            {lang === 'fr'
              ? '🍪 Utilisation des témoins'
              : '🍪 Use of cookies'}
          </p>

          <p
            style={{
              color: 'rgba(255,255,255,0.65)',
              fontSize: 13,
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {lang === 'fr'
              ? "CORO utilise uniquement les témoins nécessaires au fonctionnement et à la sécurité du service. Aucun témoin publicitaire ou de suivi n'est utilisé."
              : 'CORO uses only cookies necessary for the operation and security of the service. No advertising or tracking cookies are used.'}{' '}

            <a
              href={lang === 'fr' ? '/privacy' : '/privacy?lang=en'}
              style={{
                color: '#E74C3C',
                textDecoration: 'underline',
                fontSize: 13,
              }}
            >
              {lang === 'fr' ? 'En savoir plus' : 'Learn more'}
            </a>
          </p>
        </div>

        {/* Bouton */}
        <div
          style={{
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={acknowledge}
            style={{
              padding: '9px 22px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              backgroundColor: '#C0392B',
              color: '#FFFFFF',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#A93226';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#C0392B';
            }}
          >
            {lang === 'fr' ? 'Compris' : 'Got it'}
          </button>
        </div>
      </div>
    </div>
  );
}