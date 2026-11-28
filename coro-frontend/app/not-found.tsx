import Link from 'next/link';

/** Page introuvable : en français, avec un retour vers le tableau de bord. */
export default function NotFound() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8F9FA',
        padding: 24,
      }}
    >
      <div
        className="rounded-md"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #DEE2E6',
          padding: 32,
          maxWidth: 420,
          textAlign: 'center',
        }}
      >
        <p style={{ color: '#C0392B', fontWeight: 700, fontSize: 32, margin: 0 }}>404</p>
        <h1 style={{ color: '#2C3E50', fontSize: 18, fontWeight: 600, margin: '8px 0' }}>
          Page introuvable
        </h1>
        <p style={{ color: '#6C757D', fontSize: 14, margin: '0 0 20px' }}>
          Cette adresse n’existe pas ou n’est plus disponible.
        </p>
        <Link
          href="/dashboard"
          className="rounded"
          style={{
            display: 'inline-block',
            backgroundColor: '#C0392B',
            color: '#FFFFFF',
            padding: '8px 16px',
            fontSize: 14,
            textDecoration: 'none',
          }}
        >
          Retour au tableau de bord
        </Link>
      </div>
    </main>
  );
}
