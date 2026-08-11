import Link from 'next/link';
import { ArrowLeft, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background:
          'linear-gradient(135deg, #1A252F 0%, #22313F 55%, #2C3E50 100%)',
        color: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        position: 'relative',
        overflow: 'hidden',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Décor subtil */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          width: 520,
          height: 520,
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.06)',
          top: '-220px',
          right: '-140px',
        }}
      />

      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          width: 360,
          height: 360,
          borderRadius: '50%',
          border: '1px solid rgba(192,57,43,0.18)',
          bottom: '-180px',
          left: '-100px',
        }}
      />

      <div
        style={{
          width: '100%',
          maxWidth: 900,
          margin: '0 auto',
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          aria-label="Retour à l’accueil CORO"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            textDecoration: 'none',
            marginBottom: 54,
          }}
        >
          <span
            style={{
              fontSize: 34,
              fontWeight: 900,
              color: '#FFFFFF',
              letterSpacing: '-1px',
            }}
          >
            CO<span style={{ color: '#C0392B' }}>RO</span>
          </span>
        </Link>

        {/* 404 */}
        <div
          style={{
            fontSize: 'clamp(96px, 20vw, 190px)',
            lineHeight: 0.9,
            fontWeight: 950,
            letterSpacing: '-8px',
            color: 'rgba(255,255,255,0.06)',
            marginBottom: '-28px',
            userSelect: 'none',
          }}
        >
          404
        </div>

        <span
          style={{
            display: 'inline-block',
            backgroundColor: 'rgba(192,57,43,0.16)',
            border: '1px solid rgba(231,76,60,0.30)',
            color: '#F1948A',
            borderRadius: 999,
            padding: '7px 15px',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: 22,
          }}
        >
          Page introuvable
        </span>

        <h1
          style={{
            fontSize: 'clamp(32px, 5vw, 52px)',
            lineHeight: 1.15,
            fontWeight: 900,
            letterSpacing: '-1.5px',
            margin: '0 0 20px',
          }}
        >
          Cette page n’est pas dans le plan.
        </h1>

        <p
          style={{
            maxWidth: 650,
            margin: '0 auto',
            color: 'rgba(255,255,255,0.65)',
            fontSize: 18,
            lineHeight: 1.75,
          }}
        >
          L’adresse est peut-être incorrecte, la page a été déplacée ou elle
          n’existe plus. Revenez à l’accueil pour poursuivre votre navigation
          sur CORO.
        </p>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 14,
            flexWrap: 'wrap',
            marginTop: 38,
          }}
        >
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 9,
              minHeight: 48,
              padding: '12px 20px',
              borderRadius: 8,
              backgroundColor: '#C0392B',
              color: '#FFFFFF',
              textDecoration: 'none',
              fontSize: 15,
              fontWeight: 700,
              boxShadow: '0 10px 28px rgba(192,57,43,0.24)',
            }}
          >
            <Home size={18} strokeWidth={2.2} />
            Retour à l’accueil
          </Link>

          <Link
            href="/about"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              minHeight: 48,
              padding: '12px 20px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.22)',
              color: '#FFFFFF',
              textDecoration: 'none',
              fontSize: 15,
              fontWeight: 600,
              backgroundColor: 'rgba(255,255,255,0.04)',
            }}
          >
            <ArrowLeft size={17} strokeWidth={2.2} />
            À propos de CORO
          </Link>
        </div>

        <p
          style={{
            marginTop: 56,
            color: 'rgba(255,255,255,0.28)',
            fontSize: 13,
          }}
        >
          getcoro.io
        </p>
      </div>
    </main>
  );
}