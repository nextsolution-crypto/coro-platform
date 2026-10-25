'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';
type Action = 'CHECK_IN' | 'CHECK_OUT';
type View = 'starting' | 'pin' | 'confirm' | 'submitting' | 'done' | 'error';

export default function PresencePage() {
  const params = useParams();
  const search = useSearchParams();
  const sessionId = params.kioskToken as string;
  const challenge = search.get('challenge') || '';
  const started = useRef(false);
  const [view, setView] = useState<View>('starting');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [identity, setIdentity] = useState<{
    firstName: string;
    lastName: string;
  } | null>(null);
  const [context, setContext] = useState({ buildingName: '', entryLabel: '' });
  const [action, setAction] = useState<Action | null>(null);
  const [remember, setRemember] = useState(false);
  const idempotencyKey = useMemo(() => crypto.randomUUID().replaceAll('-', ''), []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void fetch(`${API_URL}/occupancy/presence/session/start`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, challenge }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'QR expiré');
        setContext({
          buildingName: data.buildingName,
          entryLabel: data.entryLabel || 'Entrée principale',
        });
        if (data.recognized) {
          setIdentity({
            firstName: data.recognized.firstName,
            lastName: data.recognized.lastName,
          });
          setAction(data.recognized.action);
          setView('confirm');
        } else setView('pin');
      })
      .catch((cause) => {
        setError(cause instanceof Error ? cause.message : 'Impossible de démarrer');
        setView('error');
      });
  }, [challenge, sessionId]);

  const identify = async (value: string) => {
    setView('starting');
    try {
      const res = await fetch(`${API_URL}/occupancy/presence/session/identify`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, pin: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'PIN invalide');
      setIdentity({ firstName: data.firstName, lastName: data.lastName });
      setContext({
        buildingName: data.buildingName,
        entryLabel: data.entryLabel || 'Entrée principale',
      });
      setAction(data.action);
      setPin('');
      setView('confirm');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'PIN invalide');
      setPin('');
      setView('pin');
    }
  };

  const digit = (value: string) => {
    if (view !== 'pin' || pin.length >= 4) return;
    const next = pin + value;
    setPin(next);
    setError('');
    if (next.length === 4) void identify(next);
  };

  const confirm = async () => {
    if (!action || view !== 'confirm') return;
    setView('submitting');
    try {
      const res = await fetch(`${API_URL}/occupancy/presence/session/confirm`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          action,
          idempotencyKey,
          rememberDevice: remember,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Enregistrement impossible');
      setView('done');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Enregistrement impossible');
      setView('confirm');
    }
  };

  const forget = async () => {
    await fetch(`${API_URL}/occupancy/presence/device/forget`, {
      method: 'POST',
      credentials: 'include',
    });
    setIdentity(null);
    setAction(null);
    setPin('');
    setView('pin');
  };

  const button: React.CSSProperties = {
    minHeight: 48,
    border: 0,
    borderRadius: 14,
    padding: '12px 18px',
    fontSize: 16,
    fontWeight: 800,
    cursor: 'pointer',
    outlineOffset: 3,
  };
  return (
    <main
      style={{
        minHeight: '100dvh',
        padding: 20,
        boxSizing: 'border-box',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--cg-canvas-gradient, linear-gradient(145deg,#1d2b36,#30495d))',
        color: 'var(--cg-text-primary, #20303c)',
      }}
    >
      <section
        style={{
          width: 'min(100%, 420px)',
          padding: 24,
          borderRadius: 24,
          background: 'var(--cg-glass-bg-strong, rgba(255,255,255,.96))',
          border: '1px solid var(--cg-glass-border, transparent)',
          boxShadow: 'var(--cg-shadow-card, 0 20px 60px rgba(0,0,0,.2))',
          backdropFilter: 'blur(var(--cg-blur-md, 0px)) saturate(var(--cg-glass-saturate, 100%))',
          boxSizing: 'border-box',
        }}
        aria-live="polite"
      >
        <p
          style={{
            margin: 0,
            color: 'var(--cg-text-muted, #647786)',
            fontWeight: 800,
            letterSpacing: '.08em',
            fontSize: 12,
          }}
        >
          CORO SENTINELLE
        </p>
        {context.buildingName && (
          <p
            style={{
              margin: '8px 0 20px',
              color: 'var(--cg-text-secondary, #516471)',
            }}
          >
            {context.buildingName} · {context.entryLabel}
          </p>
        )}
        {(view === 'starting' || view === 'submitting') && <h1 style={{ fontSize: 24 }}>Vérification en cours…</h1>}
        {view === 'pin' && (
          <>
            <h1 style={{ fontSize: 26, marginBottom: 6 }}>Identifiez-vous</h1>
            <p style={{ marginTop: 0, color: '#647786' }}>Saisissez votre PIN personnel. Il n’est pas conservé sur ce téléphone.</p>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 14,
                margin: '24px 0',
              }}
              aria-label={`${pin.length} chiffres saisis`}
            >
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 99,
                    background: pin.length > i ? '#20303c' : '#dbe3e8',
                  }}
                />
              ))}
            </div>
            {error && (
              <p role="alert" style={{ color: '#a42d2d' }}>
                {error}
              </p>
            )}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3,1fr)',
                gap: 10,
              }}
            >
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((key, index) =>
                key ? (
                  <button key={index} type="button" style={{ ...button, fontSize: 22, background: '#edf2f5' }} onClick={() => (key === '⌫' ? setPin((p) => p.slice(0, -1)) : digit(key))}>
                    {key}
                  </button>
                ) : (
                  <span key={index} />
                ),
              )}
            </div>
          </>
        )}
        {view === 'confirm' && identity && action && (
          <>
            <h1 style={{ fontSize: 26, marginBottom: 8 }}>
              {identity.firstName} {identity.lastName}
            </h1>
            <p style={{ color: '#526572', lineHeight: 1.5 }}>
              Confirmez votre <strong>{action === 'CHECK_IN' ? 'arrivée' : 'départ'}</strong> à {context.entryLabel}.
            </p>
            {error && (
              <p role="alert" style={{ color: '#a42d2d' }}>
                {error}
              </p>
            )}
            <label
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                minHeight: 44,
                margin: '18px 0',
              }}
            >
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Reconnaître ce téléphone personnel pendant 30 jours
            </label>
            <button
              type="button"
              style={{
                ...button,
                width: '100%',
                background: action === 'CHECK_IN' ? '#16834d' : '#176da0',
                color: 'white',
              }}
              onClick={() => void confirm()}
            >
              Confirmer mon {action === 'CHECK_IN' ? 'arrivée' : 'départ'}
            </button>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
                marginTop: 10,
              }}
            >
              <button
                type="button"
                style={{ ...button, background: '#edf2f5' }}
                onClick={() => {
                  setIdentity(null);
                  setAction(null);
                  setView('pin');
                }}
              >
                Ce n’est pas moi
              </button>
              <button type="button" style={{ ...button, background: '#edf2f5' }} onClick={() => void forget()}>
                Oublier ce téléphone
              </button>
            </div>
          </>
        )}
        {view === 'done' && (
          <>
            <div style={{ fontSize: 56, marginTop: 18 }}>✓</div>
            <h1 style={{ fontSize: 28 }}>{action === 'CHECK_IN' ? 'Arrivée enregistrée' : 'Départ enregistré'}</h1>
            <p style={{ color: '#526572' }}>L’état de présence a été mis à jour une seule fois.</p>
          </>
        )}
        {view === 'error' && (
          <>
            <h1 style={{ fontSize: 26 }}>QR non valide</h1>
            <p role="alert" style={{ color: '#a42d2d' }}>
              {error}
            </p>
            <p>Scannez le nouveau code affiché à l’entrée.</p>
          </>
        )}
      </section>
    </main>
  );
}
