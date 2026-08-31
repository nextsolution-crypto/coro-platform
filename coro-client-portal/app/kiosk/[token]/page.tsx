'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

const TYPE_OPTIONS = [
  { value: 'EMPLOYE',     label: 'Employé',     emoji: '👤', color: '#2980B9', bg: '#EBF5FB' },
  { value: 'VISITEUR',    label: 'Visiteur',    emoji: '🪪', color: '#8E44AD', bg: '#F5EEF8' },
  { value: 'CONTRACTEUR', label: 'Contracteur', emoji: '🔧', color: '#E67E22', bg: '#FEF5E7' },
];

type Screen = 'home' | 'checkin-type' | 'checkin-form' | 'checkout' | 'success' | 'offline';

export default function KioskPage() {
  const params = useParams();
  const token = params.token as string;

  const [screen, setScreen] = useState<Screen>('home');
  const [selectedType, setSelectedType] = useState<string>('');
  const [form, setForm] = useState({ firstName: '', lastName: '', company: '', reason: '', hostName: '', floor: '' });
  const [checkoutSearch, setCheckoutSearch] = useState('');
  const [checkoutResults, setCheckoutResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'offline' } | null>(null);
  const [buildingId, setBuildingId] = useState<string>('');
  const [isOnline, setIsOnline] = useState(true);
  const [currentTime, setCurrentTime] = useState('');

  // Horloge temps réel
  useEffect(() => {
    const tick = () => {
      setCurrentTime(new Date().toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' }));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  // Détection connexion
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    setIsOnline(navigator.onLine);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Résoudre buildingId depuis le token
  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/occupancy/kiosk/resolve/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.buildingId) {
          setBuildingId(d.buildingId);
        } else {
          console.error('[CORO] buildingId non résolu:', d);
        }
      })
      .catch((err) => console.error('[CORO] Erreur resolve token:', err));
  }, [token]);

  // Reset auto vers home après 30s d'inactivité
  useEffect(() => {
    if (screen === 'home') return;
    const timeout = setTimeout(() => {
      resetToHome();
    }, 30000);
    return () => clearTimeout(timeout);
  }, [screen]);

  const resetToHome = () => {
    setScreen('home');
    setSelectedType('');
    setForm({ firstName: '', lastName: '', company: '', reason: '', hostName: '', floor: '' });
    setCheckoutSearch('');
    setCheckoutResults([]);
    setMessage(null);
  };

  const handleCheckin = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setMessage({ text: 'Le prénom et le nom sont obligatoires.', type: 'error' });
      return;
    }
    if (!buildingId) {
      setMessage({ text: 'Erreur de configuration — bâtiment non résolu. Rechargez la page.', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/occupancy/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buildingId,
          kioskToken: token,
          type: selectedType,
          ...form,
        }),
      });
      const data = await res.json();
      if (data.offline) {
        setMessage({ text: 'Enregistré hors ligne — sera synchronisé dès reconnexion.', type: 'offline' });
      } else {
        setMessage({ text: `Bienvenue, ${form.firstName} ! Votre entrée a été enregistrée.`, type: 'success' });
      }
      setScreen('success');
      setTimeout(resetToHome, 4000);
    } catch {
      setMessage({ text: 'Entrée enregistrée en mode hors ligne.', type: 'offline' });
      setScreen('success');
      setTimeout(resetToHome, 4000);
    } finally {
      setLoading(false);
    }
  };

  const searchForCheckout = async () => {
    if (!checkoutSearch.trim() || checkoutSearch.length < 2) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/occupancy/buildings/${buildingId}/search?q=${encodeURIComponent(checkoutSearch)}&token=${token}`);
      const data = await res.json();
      setCheckoutResults(Array.isArray(data) ? data : []);
    } catch {
      setCheckoutResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (recordId: string, name: string) => {
    setLoading(true);
    try {
      await fetch(`${API_URL}/occupancy/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId, kioskToken: token }),
      });
      setMessage({ text: `Au revoir, ${name} ! Votre sortie a été enregistrée.`, type: 'success' });
      setScreen('success');
      setTimeout(resetToHome, 4000);
    } catch {
      setMessage({ text: 'Erreur lors de l\'enregistrement de la sortie.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // ── ÉCRAN ACCUEIL ─────────────────────────────────────────────────────────
  if (screen === 'home') {
    return (
      <div style={{
        minHeight: '100vh', backgroundColor: '#2C3E50',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 32, userSelect: 'none',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#ADB5BD', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            CORO Sentinelle
          </p>
          <p style={{ margin: '0 0 4px', fontSize: 'clamp(48px, 10vw, 72px)', fontWeight: 900, color: '#FFFFFF', lineHeight: 1 }}>
            {currentTime}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: '#ADB5BD' }}>
            {new Date().toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        {/* Boutons principaux */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 420 }}>
          <button
            type="button"
            onClick={() => setScreen('checkin-type')}
            style={{
              padding: '28px 32px', borderRadius: 16,
              border: 'none', backgroundColor: '#27AE60',
              cursor: 'pointer', textAlign: 'center',
              boxShadow: '0 8px 24px rgba(39,174,96,0.3)',
            }}
          >
            <p style={{ margin: '0 0 4px', fontSize: 28 }}>✅</p>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#FFFFFF' }}>Entrée</p>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>Enregistrer mon arrivée</p>
          </button>

          <button
            type="button"
            onClick={() => setScreen('checkout')}
            style={{
              padding: '28px 32px', borderRadius: 16,
              border: '2px solid rgba(255,255,255,0.15)',
              backgroundColor: 'rgba(255,255,255,0.08)',
              cursor: 'pointer', textAlign: 'center',
            }}
          >
            <p style={{ margin: '0 0 4px', fontSize: 28 }}>🚪</p>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#FFFFFF' }}>Sortie</p>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Enregistrer mon départ</p>
          </button>
        </div>

        {/* Indicateur connexion */}
        <div style={{ marginTop: 40, display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            backgroundColor: isOnline ? '#27AE60' : '#E74C3C',
          }} />
          <p style={{ margin: 0, fontSize: 12, color: '#ADB5BD' }}>
            {isOnline ? 'En ligne' : 'Hors ligne — mode local actif'}
          </p>
        </div>
      </div>
    );
  }

  // ── ÉCRAN CHOIX TYPE ──────────────────────────────────────────────────────
  if (screen === 'checkin-type') {
    return (
      <KioskWrapper onBack={resetToHome} title="Vous êtes...">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {TYPE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { setSelectedType(opt.value); setScreen('checkin-form'); }}
              style={{
                padding: '24px 28px', borderRadius: 14,
                border: `2px solid ${opt.bg}`,
                backgroundColor: opt.bg, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 18,
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 36 }}>{opt.emoji}</span>
              <div>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: opt.color }}>{opt.label}</p>
                <p style={{ margin: '3px 0 0', fontSize: 13, color: '#6C757D' }}>
                  {opt.value === 'EMPLOYE' && 'Je travaille dans ce bâtiment'}
                  {opt.value === 'VISITEUR' && 'Je viens pour une rencontre ou une visite'}
                  {opt.value === 'CONTRACTEUR' && 'Je viens pour des travaux ou services'}
                </p>
              </div>
            </button>
          ))}
        </div>
      </KioskWrapper>
    );
  }

  // ── ÉCRAN FORMULAIRE CHECK-IN ─────────────────────────────────────────────
  if (screen === 'checkin-form') {
    const typeInfo = TYPE_OPTIONS.find(t => t.value === selectedType);
    return (
      <KioskWrapper onBack={() => setScreen('checkin-type')} title={`Entrée — ${typeInfo?.label}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {message?.type === 'error' && (
            <div style={{ padding: '12px 16px', backgroundColor: '#FDEDEC', borderRadius: 8, border: '1px solid #F1948A' }}>
              <p style={{ margin: 0, fontSize: 13, color: '#C0392B', fontWeight: 600 }}>{message.text}</p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <KioskInput label="Prénom *" value={form.firstName} onChange={v => setForm(f => ({ ...f, firstName: v }))} />
            <KioskInput label="Nom *" value={form.lastName} onChange={v => setForm(f => ({ ...f, lastName: v }))} />
          </div>

          {selectedType !== 'EMPLOYE' && (
            <KioskInput label="Entreprise" value={form.company} onChange={v => setForm(f => ({ ...f, company: v }))} />
          )}

          {selectedType === 'VISITEUR' && (
            <KioskInput label="Personne visitée" value={form.hostName} onChange={v => setForm(f => ({ ...f, hostName: v }))} />
          )}

          <KioskInput label="Raison de la visite" value={form.reason} onChange={v => setForm(f => ({ ...f, reason: v }))} />
          <KioskInput label="Étage / Zone" value={form.floor} onChange={v => setForm(f => ({ ...f, floor: v }))} />

          <button
            type="button"
            onClick={handleCheckin}
            disabled={loading}
            style={{
              marginTop: 8, padding: '20px', borderRadius: 12,
              border: 'none', backgroundColor: '#27AE60',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 18, fontWeight: 800, color: '#FFFFFF',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Enregistrement...' : '✅ Confirmer mon entrée'}
          </button>
        </div>
      </KioskWrapper>
    );
  }

  // ── ÉCRAN CHECKOUT ────────────────────────────────────────────────────────
  if (screen === 'checkout') {
    return (
      <KioskWrapper onBack={resetToHome} title="Enregistrer ma sortie">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="text"
              placeholder="Rechercher par nom..."
              value={checkoutSearch}
              onChange={e => setCheckoutSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchForCheckout()}
              style={{
                flex: 1, padding: '16px 18px', borderRadius: 10,
                border: '2px solid #E9ECEF', fontSize: 16,
                backgroundColor: '#F8F9FA', outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={searchForCheckout}
              disabled={loading}
              style={{
                padding: '16px 22px', borderRadius: 10,
                border: 'none', backgroundColor: '#2C3E50',
                cursor: 'pointer', fontSize: 15, fontWeight: 700, color: '#FFFFFF',
              }}
            >
              🔍
            </button>
          </div>

          {checkoutResults.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {checkoutResults.map((r: any) => {
                const cfg = TYPE_OPTIONS.find(t => t.value === r.type);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleCheckout(r.id, `${r.firstName} ${r.lastName}`)}
                    style={{
                      padding: '16px 20px', borderRadius: 12,
                      border: '2px solid #E9ECEF', backgroundColor: '#FFFFFF',
                      cursor: 'pointer', display: 'flex',
                      alignItems: 'center', gap: 14, textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: 28 }}>{cfg?.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#2C3E50' }}>
                        {r.firstName} {r.lastName}
                      </p>
                      <p style={{ margin: '3px 0 0', fontSize: 12, color: '#ADB5BD' }}>
                        {cfg?.label} · Arrivé à {new Date(r.checkedInAt).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span style={{ fontSize: 13, color: '#C0392B', fontWeight: 700 }}>Sortie →</span>
                  </button>
                );
              })}
            </div>
          )}

          {checkoutResults.length === 0 && checkoutSearch.length >= 2 && !loading && (
            <p style={{ textAlign: 'center', color: '#ADB5BD', fontSize: 14, padding: '20px 0' }}>
              Aucun occupant trouvé avec ce nom.
            </p>
          )}
        </div>
      </KioskWrapper>
    );
  }

  // ── ÉCRAN SUCCÈS ──────────────────────────────────────────────────────────
  if (screen === 'success') {
    const isOffline = message?.type === 'offline';
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: isOffline ? '#FEF5E7' : '#EAFAF1',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 32, textAlign: 'center',
      }}>
        <p style={{ fontSize: 80, margin: '0 0 20px' }}>{isOffline ? '📡' : '✅'}</p>
        <h2 style={{ margin: '0 0 12px', fontSize: 28, fontWeight: 900, color: isOffline ? '#E67E22' : '#27AE60' }}>
          {isOffline ? 'Enregistré hors ligne' : 'Enregistrement réussi'}
        </h2>
        <p style={{ margin: 0, fontSize: 16, color: '#6C757D', maxWidth: 360, lineHeight: 1.6 }}>
          {message?.text}
        </p>
        <p style={{ margin: '24px 0 0', fontSize: 13, color: '#ADB5BD' }}>
          Retour automatique dans quelques secondes...
        </p>
      </div>
    );
  }

  return null;
}

// ── Composants réutilisables ──────────────────────────────────────────────────

function KioskWrapper({ children, onBack, title }: { children: React.ReactNode; onBack: () => void; title: string }) {
  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#F8F9FA',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', padding: '32px 24px',
    }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              padding: '10px 16px', borderRadius: 8,
              border: '1px solid #E9ECEF', backgroundColor: '#FFFFFF',
              cursor: 'pointer', fontSize: 13, color: '#6C757D', fontWeight: 600,
            }}
          >
            ← Retour
          </button>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#2C3E50' }}>
            {title}
          </h1>
        </div>
        {children}
      </div>
    </div>
  );
}

function KioskInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#6C757D', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', padding: '14px 16px', borderRadius: 10,
          border: '2px solid #E9ECEF', fontSize: 16,
          backgroundColor: '#FFFFFF', outline: 'none',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}