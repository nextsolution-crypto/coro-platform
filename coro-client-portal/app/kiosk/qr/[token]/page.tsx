'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

type Status = 'loading' | 'success' | 'checkedout' | 'already' | 'error';

export default function QrLandingPage() {
  const params = useParams();
  const router = useRouter();
  const qrToken = params.token as string;

  const [status, setStatus] = useState<Status>('loading');
  const [name, setName] = useState('');
  const [kioskUrl, setKioskUrl] = useState('');

  useEffect(() => {
    if (!qrToken) { setStatus('error'); return; }

    // Récupérer le token kiosque depuis localStorage (sauvegardé par la borne)
    const kioskToken = localStorage.getItem('coro_kiosk_token') || '';
    const storedKioskUrl = localStorage.getItem('coro_kiosk_url') || '';
    setKioskUrl(storedKioskUrl);

    processQr(qrToken, kioskToken, storedKioskUrl);
  }, [qrToken]);

  // Redirection automatique après 3 secondes
  useEffect(() => {
    if (status === 'loading') return;
    const timeout = setTimeout(() => {
      const url = kioskUrl || localStorage.getItem('coro_kiosk_url') || '/';
      window.location.href = url;
    }, 3000);
    return () => clearTimeout(timeout);
  }, [status, kioskUrl]);

  const processQr = async (qrToken: string, kioskToken: string, kUrl: string) => {
    try {
      // 1. Résoudre les infos du QR
      const infoRes = await fetch(`${API_URL}/occupancy/qr/info/${qrToken}`);
      const info = infoRes.ok ? await infoRes.json() : null;

      if (!info) { setStatus('error'); return; }

      const personName = `${info.firstName} ${info.lastName}`;
      setName(personName);

      if (!kioskToken) {
        // Pas de token kiosque — juste afficher les infos
        setStatus('success');
        return;
      }

      // 2. Essayer check-in employé
      if (info.type === 'employee') {
        const resEmp = await fetch(`${API_URL}/occupancy/qr/employee`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ qrToken, kioskToken }),
        });
        if (resEmp.ok) {
          const data = await resEmp.json();
          if (data.alreadyIn) {
            // Déjà présent → faire le checkout
            await fetch(`${API_URL}/occupancy/qr/checkout`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ qrToken, kioskToken }),
            });
            setStatus('checkedout');
          } else {
            setStatus('success');
          }
          return;
        }
      }

      // 3. Essayer check-in invitation
      if (info.type === 'invitation') {
        if (info.status === 'USED') {
          // Déjà utilisée → checkout
          await fetch(`${API_URL}/occupancy/qr/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ qrToken, kioskToken }),
          });
          setStatus('checkedout');
          return;
        }

        const resInv = await fetch(`${API_URL}/occupancy/qr/invitation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ qrToken, kioskToken }),
        });
        if (resInv.ok) {
          setStatus('success');
          return;
        }
      }

      setStatus('error');
    } catch {
      setStatus('error');
    }
  };

  const bgColor = {
    loading: '#2C3E50',
    success: '#EAFAF1',
    checkedout: '#EBF5FB',
    already: '#FEF5E7',
    error: '#FDEDEC',
  }[status];

  const emoji = {
    loading: '⏳',
    success: '✅',
    checkedout: '👋',
    already: '📋',
    error: '⚠️',
  }[status];

  const title = {
    loading: 'Vérification...',
    success: `Bienvenue, ${name} !`,
    checkedout: `Au revoir, ${name} !`,
    already: `${name} — Déjà enregistré`,
    error: 'QR Code invalide',
  }[status];

  const subtitle = {
    loading: 'Traitement en cours...',
    success: 'Votre entrée a été enregistrée automatiquement.',
    checkedout: 'Votre sortie a été enregistrée. Bonne journée !',
    already: 'Vous êtes déjà enregistré pour aujourd\'hui.',
    error: 'Ce code n\'est pas reconnu ou a expiré.',
  }[status];

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: bgColor,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 32, textAlign: 'center',
      transition: 'background-color 0.3s',
    }}>
      {status !== 'loading' && (
        <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#ADB5BD', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          CORO Sentinelle
        </p>
      )}

      <p style={{ fontSize: status === 'loading' ? 48 : 80, margin: '0 0 20px' }}
        className={status === 'loading' ? 'animate-pulse' : ''}>
        {emoji}
      </p>

      {status !== 'loading' && (
        <>
          <h2 style={{
            margin: '0 0 12px', fontSize: 'clamp(22px, 6vw, 32px)',
            fontWeight: 900,
            color: status === 'success' ? '#27AE60'
              : status === 'checkedout' ? '#2980B9'
              : status === 'error' ? '#C0392B'
              : '#E67E22',
          }}>
            {title}
          </h2>
          <p style={{ margin: '0 0 32px', fontSize: 16, color: '#6C757D', maxWidth: 360, lineHeight: 1.6 }}>
            {subtitle}
          </p>

          {/* Barre de progression retour */}
          <div style={{ width: 200, height: 4, backgroundColor: '#E9ECEF', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99,
              backgroundColor: status === 'success' ? '#27AE60' : status === 'checkedout' ? '#2980B9' : '#ADB5BD',
              animation: 'shrink 3s linear forwards',
            }} />
          </div>
          <p style={{ margin: '12px 0 0', fontSize: 12, color: '#ADB5BD' }}>
            Retour à la borne dans 3 secondes...
          </p>
        </>
      )}

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}