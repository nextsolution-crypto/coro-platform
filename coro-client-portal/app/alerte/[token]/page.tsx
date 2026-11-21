'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

// Réponse d'un destinataire d'une alerte panique (lien personnel, 24 h).
// Décision du 21 nov. 2026 : je prends en charge / en sécurité / besoin d'aide.

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

const TYPE_LABELS: Record<string, string> = {
  THREAT: 'Menace ou violence · Threat or violence',
  MEDICAL: 'Urgence médicale · Medical emergency',
  FIRE: 'Feu ou fumée · Fire or smoke',
  OTHER: 'Urgence · Emergency',
};

const OPTIONS: Record<string, { fr: string; en: string; bg: string }> = {
  TAKING_CHARGE: { fr: 'Je prends en charge', en: 'I am taking charge', bg: '#1E8449' },
  SAFE: { fr: 'Je suis en sécurité', en: 'I am safe', bg: '#1F618D' },
  NEED_HELP: { fr: 'J’ai besoin d’aide', en: 'I need help', bg: '#C0392B' },
};

export default function PanicResponsePage() {
  const params = useParams();
  const token = params.token as string;
  const [context, setContext] = useState<any>(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/occupancy/panic/respond/${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.message || 'Lien invalide ou expiré');
        setContext(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Lien invalide ou expiré');
      }
    })();
  }, [token]);

  const respond = async (response: string) => {
    setSending(response);
    setError('');
    try {
      const res = await fetch(`${API_URL}/occupancy/panic/respond/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Réponse non enregistrée');
      setContext((prev: any) => ({ ...prev, response: data.response, respondedAt: data.respondedAt }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Réponse non enregistrée. Réessayez.');
    } finally {
      setSending(null);
    }
  };

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#F8F9FA', padding: 16, fontFamily: '-apple-system, sans-serif' }}>
      <div style={{ maxWidth: 440, margin: '0 auto', backgroundColor: '#FFFFFF', borderRadius: 6, overflow: 'hidden', border: '1px solid #E9ECEF' }}>
        <div style={{ backgroundColor: '#C0392B', padding: '18px 20px' }}>
          <p style={{ margin: 0, color: '#FFFFFF', fontSize: 20, fontWeight: 900 }}>🚨 CORO — Alerte · Alert</p>
          {context && (
            <p style={{ margin: '4px 0 0', color: '#F5B7B1', fontSize: 13, fontWeight: 700 }}>
              {TYPE_LABELS[context.panicType] || TYPE_LABELS.OTHER} · {context.buildingName}
            </p>
          )}
        </div>
        <div style={{ padding: 20 }}>
          {error && !context && <p role="alert" style={{ color: '#C0392B', fontWeight: 700 }}>{error}</p>}
          {!error && !context && <p style={{ color: '#ADB5BD' }}>Chargement…</p>}
          {context && (
            <>
              <p style={{ margin: '0 0 16px', fontSize: 15, color: '#2C3E50' }}>
                {context.name ? `${context.name}, ` : ''}indiquez votre situation. · Tell us your status.
              </p>
              {(context.options || []).map((option: string) => (
                <button
                  key={option}
                  type="button"
                  disabled={sending !== null}
                  onClick={() => respond(option)}
                  aria-pressed={context.response === option}
                  style={{
                    display: 'block', width: '100%', marginBottom: 10, padding: 16, borderRadius: 6,
                    border: context.response === option ? '3px solid #2C3E50' : 'none',
                    backgroundColor: OPTIONS[option]?.bg || '#2C3E50', color: '#FFFFFF',
                    fontSize: 17, fontWeight: 900, cursor: 'pointer',
                  }}
                >
                  {context.response === option ? '✓ ' : ''}{OPTIONS[option]?.fr} · {OPTIONS[option]?.en}
                </button>
              ))}
              {context.response && (
                <p style={{ margin: '4px 0 12px', fontSize: 13, color: '#1E8449', fontWeight: 700 }}>
                  Réponse enregistrée · Response saved
                  {context.respondedAt ? ` (${new Date(context.respondedAt).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })})` : ''}. Vous pouvez la modifier.
                </p>
              )}
              {error && <p role="alert" style={{ color: '#C0392B', fontWeight: 700 }}>{error}</p>}
            </>
          )}
          <a href="tel:911" style={{ display: 'block', textAlign: 'center', marginTop: 8, padding: 14, borderRadius: 6, backgroundColor: '#1A1A1A', color: '#FFFFFF', textDecoration: 'none', fontSize: 18, fontWeight: 900 }}>
            📞 911
          </a>
          <p style={{ margin: '12px 0 0', fontSize: 11, color: '#ADB5BD', textAlign: 'center' }}>
            Ce lien vous est personnel. · This link is personal to you.
          </p>
        </div>
      </div>
    </main>
  );
}
