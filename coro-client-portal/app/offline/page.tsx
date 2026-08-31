export default function OfflinePage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F8F9FA',
      padding: 24,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 64, marginBottom: 24 }}>📡</div>
      <h1 style={{ margin: '0 0 12px', fontSize: 24, fontWeight: 800, color: '#2C3E50' }}>
        Connexion non disponible
      </h1>
      <p style={{ margin: '0 0 32px', fontSize: 15, color: '#6C757D', maxWidth: 360, lineHeight: 1.6 }}>
        La borne CORO Sentinelle fonctionne en mode hors ligne. 
        Les enregistrements sont sauvegardés localement et seront 
        synchronisés dès le retour de la connexion.
      </p>
      <div style={{
        backgroundColor: '#EAFAF1',
        border: '1px solid #A9DFBF',
        borderRadius: 12,
        padding: '16px 24px',
        maxWidth: 360,
      }}>
        <p style={{ margin: 0, fontSize: 14, color: '#27AE60', fontWeight: 600 }}>
          ✅ Mode hors ligne actif
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#6C757D' }}>
          Les check-ins continuent de fonctionner normalement.
        </p>
      </div>
    </div>
  );
}