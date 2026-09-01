'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

type Status = 'pin' | 'loading' | 'checkin' | 'checkout' | 'error';

export default function PresencePage() {
  const params = useParams();
  const kioskToken = params.kioskToken as string;

  const [status, setStatus] = useState<Status>('pin');
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  // Retour automatique après résultat
  useEffect(() => {
    if (status !== 'checkin' && status !== 'checkout') return;
    const timeout = setTimeout(() => {
      setStatus('pin');
      setPin('');
      setName('');
      setError('');
    }, 3000);
    return () => clearTimeout(timeout);
  }, [status]);

  const handlePinDigit = (digit: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    if (newPin.length === 4) {
      submitPin(newPin);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  const submitPin = async (pinValue: string) => {
    setStatus('loading');
    setError('');
    try {
      const res = await fetch(`${API_URL}/occupancy/presence/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kioskToken, pin: pinValue }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'PIN invalide');
        setPin('');
        setStatus('pin');
        return;
      }
      setName(`${data.employee.firstName} ${data.employee.lastName}`);
      setStatus(data.action === 'checkin' ? 'checkin' : 'checkout');
    } catch {
      setError('Erreur de connexion. Réessayez.');
      setPin('');
      setStatus('pin');
    }
  };

  // ── ÉCRAN RÉSULTAT ────────────────────────────────────────────────────────
  if (status === 'checkin' || status === 'checkout') {
    const isIn = status === 'checkin';
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: isIn ? '#EAFAF1' : '#EBF5FB',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 32, textAlign: 'center',
      }}>
        <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#ADB5BD', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          CORO Sentinelle
        </p>
        <p style={{ fontSize: 80, margin: '16px 0' }}>{isIn ? '✅' : '👋'}</p>
        <h2 style={{ margin: '0 0 8px', fontSize: 'clamp(24px, 6vw, 36px)', fontWeight: 900, color: isIn ? '#27AE60' : '#2980B9' }}>
          {isIn ? `Bienvenue, ${name} !` : `Au revoir, ${name} !`}
        </h2>
        <p style={{ margin: '0 0 32px', fontSize: 15, color: '#6C757D' }}>
          {isIn ? 'Votre entrée a été enregistrée.' : 'Votre sortie a été enregistrée.'}
        </p>
        {/* Barre de progression */}
        <div style={{ width: 200, height: 4, backgroundColor: '#E9ECEF', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 99,
            backgroundColor: isIn ? '#27AE60' : '#2980B9',
            animation: 'shrink 3s linear forwards',
          }} />
        </div>
        <p style={{ margin: '12px 0 0', fontSize: 12, color: '#ADB5BD' }}>
          Fermeture automatique dans 3 secondes...
        </p>
        <style>{`
          @keyframes shrink { from { width: 100%; } to { width: 0%; } }
        `}</style>
      </div>
    );
  }

  // ── ÉCRAN CHARGEMENT ──────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#2C3E50', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#ADB5BD', fontSize: 14 }} className="animate-pulse">Vérification...</p>
      </div>
    );
  }

  // ── ÉCRAN SAISIE PIN ──────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#2C3E50',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 32, userSelect: 'none',
    }}>
      <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#ADB5BD', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        CORO Sentinelle
      </p>
      <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: '#FFFFFF' }}>
        Entrez votre PIN
      </h2>
      <p style={{ margin: '0 0 32px', fontSize: 13, color: '#ADB5BD' }}>
        Code à 4 chiffres personnel
      </p>

      {/* Indicateur PIN */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            width: 20, height: 20, borderRadius: '50%',
            backgroundColor: pin.length > i ? '#FFFFFF' : 'rgba(255,255,255,0.2)',
            transition: 'background-color 0.15s',
          }} />
        ))}
      </div>

      {/* Message erreur */}
      {error && (
        <p style={{ margin: '0 0 16px', fontSize: 13, color: '#E74C3C', fontWeight: 600 }}>
          {error}
        </p>
      )}
      {!error && <div style={{ height: 29, marginBottom: 16 }} />}

      {/* Clavier numérique */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, width: '100%', maxWidth: 300 }}>
        {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((key, i) => {
          if (key === '') return <div key={i} />;
          const isDelete = key === '⌫';
          return (
            <button
              key={i}
              type="button"
              onClick={() => isDelete ? handleDelete() : handlePinDigit(key)}
              style={{
                height: 72, borderRadius: 16,
                border: isDelete ? '2px solid rgba(255,255,255,0.15)' : 'none',
                backgroundColor: isDelete ? 'transparent' : 'rgba(255,255,255,0.12)',
                color: '#FFFFFF',
                fontSize: isDelete ? 24 : 28,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'background-color 0.1s',
              }}
              onTouchStart={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.25)'; }}
              onTouchEnd={e => { e.currentTarget.style.backgroundColor = isDelete ? 'transparent' : 'rgba(255,255,255,0.12)'; }}
            >
              {key}
            </button>
          );
        })}
      </div>

      <p style={{ margin: '32px 0 0', fontSize: 12, color: '#ADB5BD', textAlign: 'center', maxWidth: 260, lineHeight: 1.6 }}>
        Votre PIN vous a été envoyé par courriel lors de votre enregistrement.
      </p>
    </div>
  );
}