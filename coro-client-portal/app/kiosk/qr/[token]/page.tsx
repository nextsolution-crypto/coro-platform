'use client';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

export default function QrLandingPage() {
  const params = useParams();
  const qrToken = params.token as string;

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'invalid'>('loading');
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [isEmployee, setIsEmployee] = useState(false);

  useEffect(() => {
    if (!qrToken) { setStatus('invalid'); return; }

    // Ce QR est scanné directement dans un navigateur (pas sur la borne)
    // On affiche les infos du visiteur/employé pour qu'il sache que c'est bon
    resolveToken();
  }, [qrToken]);

  const resolveToken = async () => {
    // Essayer employé
    try {
      const res = await fetch(`${API_URL}/occupancy/qr/info/${qrToken}`);
      if (res.ok) {
        const data = await res.json();
        setName(`${data.firstName} ${data.lastName}`);
        setIsEmployee(data.type === 'employee');
        setStatus('success');
        return;
      }
    } catch {}
    setStatus('invalid');
  };

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#2C3E50', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#ADB5BD', fontSize: 14 }} className="animate-pulse">Vérification...</p>
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#2C3E50', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
        <p style={{ fontSize: 64, margin: '0 0 16px' }}>⚠️</p>
        <h2 style={{ color: '#FFFFFF', fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>QR Code invalide</h2>
        <p style={{ color: '#ADB5BD', fontSize: 14, maxWidth: 300 }}>Ce code n&apos;est pas reconnu ou a expiré. Contactez votre responsable.</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#2C3E50', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
      <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#ADB5BD', textTransform: 'uppercase', letterSpacing: '0.1em' }}>CORO Sentinelle</p>

      <div style={{ margin: '24px 0', padding: 32, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, border: '2px solid rgba(255,255,255,0.15)' }}>
        <p style={{ fontSize: 64, margin: '0 0 16px' }}>{isEmployee ? '👤' : '🪪'}</p>
        <h2 style={{ color: '#FFFFFF', fontSize: 24, fontWeight: 900, margin: '0 0 4px' }}>{name}</h2>
        <p style={{ color: '#ADB5BD', fontSize: 14, margin: 0 }}>{isEmployee ? 'Employé' : 'Visiteur invité'}</p>
      </div>

      <div style={{ padding: '16px 24px', backgroundColor: '#EAFAF1', borderRadius: 12, maxWidth: 320 }}>
        <p style={{ margin: 0, fontSize: 14, color: '#27AE60', fontWeight: 700 }}>✅ QR Code valide</p>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#6C757D' }}>
          Présentez ce code à la borne d&apos;accueil pour enregistrer votre entrée automatiquement.
        </p>
      </div>
    </div>
  );
}