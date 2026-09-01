'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

const TYPE_OPTIONS = [
  { value: 'EMPLOYE',     label: 'Employé',     emoji: '👤', color: '#2980B9', bg: '#EBF5FB' },
  { value: 'VISITEUR',    label: 'Visiteur',    emoji: '🪪', color: '#8E44AD', bg: '#F5EEF8' },
  { value: 'CONTRACTEUR', label: 'Contracteur', emoji: '🔧', color: '#E67E22', bg: '#FEF5E7' },
];

type Screen = 'loading' | 'error' | 'home' | 'checkin-type' | 'checkin-form' | 'checkout' | 'scanner' | 'success';

export default function KioskPage() {
  const params = useParams();
  const token = params.token as string;

  const [screen, setScreen] = useState<Screen>('loading');
  const [buildingId, setBuildingId] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [form, setForm] = useState({ firstName: '', lastName: '', company: '', reason: '', hostName: '', floor: '' });
  const [checkoutSearch, setCheckoutSearch] = useState('');
  const [checkoutResults, setCheckoutResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'offline' } | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [currentTime, setCurrentTime] = useState('');
  const [scannerStarted, setScannerStarted] = useState(false);

  const handleQrScan = async (qrToken: string) => {
    if (!buildingId || loading) return;
    setLoading(true);
    try {
      // 1. Résoudre les infos du QR pour savoir qui c'est
      const infoRes = await fetch(`${API_URL}/occupancy/qr/info/${qrToken}`);
      const info = infoRes.ok ? await infoRes.json() : null;

      // 2. Essayer check-in employé
      const resEmp = await fetch(`${API_URL}/occupancy/qr/employee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrToken, kioskToken: token }),
      });
      if (resEmp.ok) {
        const data = await resEmp.json();
        const name = `${data.employee.firstName} ${data.employee.lastName}`;
        if (data.alreadyIn) {
          // Déjà présent → proposer checkout
          const doCheckout = confirm(`${name} est déjà enregistré(e).\n\nEnregistrer la SORTIE ?`);
          if (doCheckout) {
            await fetch(`${API_URL}/occupancy/qr/checkout`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ qrToken, kioskToken: token }),
            });
            setMessage({ text: `Au revoir, ${name} ! Votre sortie a été enregistrée.`, type: 'success' });
          } else {
            setMessage({ text: `${name} est déjà enregistré(e) en entrée.`, type: 'success' });
          }
        } else {
          setMessage({ text: `Bienvenue, ${name} ! Entrée enregistrée automatiquement.`, type: 'success' });
        }
        setScreen('success');
        setTimeout(resetToHome, 4000);
        return;
      }

      // 3. Essayer check-in invitation visiteur
      const resInv = await fetch(`${API_URL}/occupancy/qr/invitation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrToken, kioskToken: token }),
      });
      if (resInv.ok) {
        const data = await resInv.json();
        setMessage({
          text: `Bienvenue, ${data.invitation.firstName} ! Votre invitation a été validée.`,
          type: 'success',
        });
        setScreen('success');
        setTimeout(resetToHome, 4000);
        return;
      }

      // 4. Invitation déjà utilisée → tenter checkout
      if (info?.type === 'invitation' && info?.status === 'USED') {
        const resOut = await fetch(`${API_URL}/occupancy/qr/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ qrToken, kioskToken: token }),
        });
        if (resOut.ok) {
          setMessage({ text: `Au revoir, ${info.firstName} ! Votre sortie a été enregistrée.`, type: 'success' });
          setScreen('success');
          setTimeout(resetToHome, 4000);
          return;
        }
      }

      setMessage({ text: 'QR Code invalide ou expiré.', type: 'error' });
      setScreen('success');
      setTimeout(resetToHome, 3000);
    } catch {
      setMessage({ text: 'Erreur lors de la lecture du QR.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Horloge
  useEffect(() => {
    const tick = () => setCurrentTime(new Date().toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' }));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  // Connexion
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    setIsOnline(navigator.onLine);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  // Résoudre buildingId AU CHARGEMENT — bloquer tant que pas résolu
  useEffect(() => {
    if (!token) return;
    setScreen('loading');
    fetch(`${API_URL}/occupancy/kiosk/resolve/${token}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d?.buildingId) {
          setBuildingId(d.buildingId);
          setScreen('home');
        } else {
          setScreen('error');
        }
      })
      .catch(() => setScreen('error'));
  }, [token]);

  // Reset auto après 30s
  useEffect(() => {
    if (screen === 'home' || screen === 'loading' || screen === 'error') return;
    const timeout = setTimeout(resetToHome, 30000);
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
      setMessage({ text: 'Erreur — bâtiment non résolu. Rechargez la page.', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/occupancy/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buildingId, kioskToken: token, type: selectedType, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erreur');
      setMessage({ text: `Bienvenue, ${form.firstName} ! Votre entrée a été enregistrée.`, type: 'success' });
      setScreen('success');
      setTimeout(resetToHome, 4000);
    } catch (err: any) {
      setMessage({ text: err.message || 'Errée lors de l\'enregistrement.', type: 'error' });
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
    } catch { setCheckoutResults([]); }
    finally { setLoading(false); }
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
      setMessage({ text: 'Erreur lors de l\'enregistrement.', type: 'error' });
    } finally { setLoading(false); }
  };

  // ── ÉCRAN CHARGEMENT ──
  if (screen === 'loading') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#2C3E50', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#ADB5BD', fontSize: 14 }} className="animate-pulse">Initialisation de la borne...</p>
      </div>
    );
  }

  // ── ÉCRAN ERREUR ──
  if (screen === 'error') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#2C3E50', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
        <p style={{ fontSize: 48, margin: '0 0 16px' }}>⚠️</p>
        <h2 style={{ color: '#FFFFFF', fontSize: 20, fontWeight: 800, margin: '0 0 8px' }}>Borne non configurée</h2>
        <p style={{ color: '#ADB5BD', fontSize: 14 }}>Token invalide ou expiré. Contactez votre administrateur.</p>
      </div>
    );
  }

  // ── ÉCRAN ACCUEIL ──
  if (screen === 'home') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#2C3E50', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, userSelect: 'none' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#ADB5BD', textTransform: 'uppercase', letterSpacing: '0.1em' }}>CORO Sentinelle</p>
          <p style={{ margin: '0 0 4px', fontSize: 'clamp(48px, 10vw, 72px)', fontWeight: 900, color: '#FFFFFF', lineHeight: 1 }}>{currentTime}</p>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: '#ADB5BD' }}>{new Date().toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 420 }}>
          {/* Scanner QR — priorité visuelle */}
          <button type="button" onClick={() => { setScannerStarted(true); setScreen('scanner'); }}
            style={{ padding: '20px 32px', borderRadius: 16, border: '2px solid rgba(255,255,255,0.3)', backgroundColor: 'rgba(255,255,255,0.12)', cursor: 'pointer', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <p style={{ margin: 0, fontSize: 24 }}>📷</p>
            <div>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#FFFFFF' }}>Scanner mon QR</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Employé ou visiteur invité</p>
            </div>
          </button>
          <button type="button" onClick={() => setScreen('checkin-type')}
            style={{ padding: '28px 32px', borderRadius: 16, border: 'none', backgroundColor: '#27AE60', cursor: 'pointer', textAlign: 'center', boxShadow: '0 8px 24px rgba(39,174,96,0.3)' }}>
            <p style={{ margin: '0 0 4px', fontSize: 28 }}>✅</p>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#FFFFFF' }}>Entrée</p>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>Enregistrer mon arrivée</p>
          </button>
          <button type="button" onClick={() => setScreen('checkout')}
            style={{ padding: '28px 32px', borderRadius: 16, border: '2px solid rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.08)', cursor: 'pointer', textAlign: 'center' }}>
            <p style={{ margin: '0 0 4px', fontSize: 28 }}>🚪</p>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#FFFFFF' }}>Sortie</p>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Enregistrer mon départ</p>
          </button>
        </div>
        <div style={{ marginTop: 40, display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: isOnline ? '#27AE60' : '#E74C3C' }} />
          <p style={{ margin: 0, fontSize: 12, color: '#ADB5BD' }}>{isOnline ? 'En ligne' : 'Hors ligne'}</p>
        </div>
      </div>
    );
  }

  // ── ÉCRAN CHOIX TYPE ──
  if (screen === 'checkin-type') {
    return (
      <KioskWrapper onBack={resetToHome} title="Vous êtes...">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {TYPE_OPTIONS.map(opt => (
            <button key={opt.value} type="button" onClick={() => { setSelectedType(opt.value); setScreen('checkin-form'); }}
              style={{ padding: '24px 28px', borderRadius: 14, border: `2px solid ${opt.bg}`, backgroundColor: opt.bg, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 18, textAlign: 'left' }}>
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

  // ── ÉCRAN FORMULAIRE ──
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
          {selectedType !== 'EMPLOYE' && <KioskInput label="Entreprise" value={form.company} onChange={v => setForm(f => ({ ...f, company: v }))} />}
          {selectedType === 'VISITEUR' && <KioskInput label="Personne visitée" value={form.hostName} onChange={v => setForm(f => ({ ...f, hostName: v }))} />}
          <KioskInput label="Raison de la visite" value={form.reason} onChange={v => setForm(f => ({ ...f, reason: v }))} />
          <KioskInput label="Étage / Zone" value={form.floor} onChange={v => setForm(f => ({ ...f, floor: v }))} />
          <button type="button" onClick={handleCheckin} disabled={loading}
            style={{ marginTop: 8, padding: '20px', borderRadius: 12, border: 'none', backgroundColor: '#27AE60', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 18, fontWeight: 800, color: '#FFFFFF', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Enregistrement...' : '✅ Confirmer mon entrée'}
          </button>
        </div>
      </KioskWrapper>
    );
  }

  // ── ÉCRAN SCANNER QR ──
  if (screen === 'scanner') {
    return (
      <QrScannerScreen
        onScan={handleQrScan}
        onBack={resetToHome}
        started={scannerStarted}
      />
    );
  }

  // ── ÉCRAN CHECKOUT ──
  if (screen === 'checkout') {
    return (
      <KioskWrapper onBack={resetToHome} title="Enregistrer ma sortie">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <input type="text" placeholder="Rechercher par nom..." value={checkoutSearch}
              onChange={e => setCheckoutSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchForCheckout()}
              style={{ flex: 1, padding: '16px 18px', borderRadius: 10, border: '2px solid #E9ECEF', fontSize: 16, backgroundColor: '#F8F9FA', outline: 'none' }} />
            <button type="button" onClick={searchForCheckout} disabled={loading}
              style={{ padding: '16px 22px', borderRadius: 10, border: 'none', backgroundColor: '#2C3E50', cursor: 'pointer', fontSize: 15, fontWeight: 700, color: '#FFFFFF' }}>
              🔍
            </button>
          </div>
          {checkoutResults.map((r: any) => {
            const cfg = TYPE_OPTIONS.find(t => t.value === r.type);
            return (
              <button key={r.id} type="button" onClick={() => handleCheckout(r.id, `${r.firstName} ${r.lastName}`)}
                style={{ padding: '16px 20px', borderRadius: 12, border: '2px solid #E9ECEF', backgroundColor: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left' }}>
                <span style={{ fontSize: 28 }}>{cfg?.emoji}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#2C3E50' }}>{r.firstName} {r.lastName}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 12, color: '#ADB5BD' }}>
                    {cfg?.label} · Arrivé à {new Date(r.checkedInAt).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <span style={{ fontSize: 13, color: '#C0392B', fontWeight: 700 }}>Sortie →</span>
              </button>
            );
          })}
          {checkoutResults.length === 0 && checkoutSearch.length >= 2 && !loading && (
            <p style={{ textAlign: 'center', color: '#ADB5BD', fontSize: 14, padding: '20px 0' }}>Aucun occupant trouvé avec ce nom.</p>
          )}
        </div>
      </KioskWrapper>
    );
  }

  // ── ÉCRAN SUCCÈS ──
  if (screen === 'success') {
    const isOffline = message?.type === 'offline';
    return (
      <div style={{ minHeight: '100vh', backgroundColor: isOffline ? '#FEF5E7' : '#EAFAF1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
        <p style={{ fontSize: 80, margin: '0 0 20px' }}>{isOffline ? '📡' : '✅'}</p>
        <h2 style={{ margin: '0 0 12px', fontSize: 28, fontWeight: 900, color: isOffline ? '#E67E22' : '#27AE60' }}>
          {isOffline ? 'Enregistré hors ligne' : 'Enregistrement réussi'}
        </h2>
        <p style={{ margin: 0, fontSize: 16, color: '#6C757D', maxWidth: 360, lineHeight: 1.6 }}>{message?.text}</p>
        <p style={{ margin: '24px 0 0', fontSize: 13, color: '#ADB5BD' }}>Retour automatique dans quelques secondes...</p>
      </div>
    );
  }

  return null;
}

function KioskWrapper({ children, onBack, title }: { children: React.ReactNode; onBack: () => void; title: string }) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8F9FA', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 24px' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <button type="button" onClick={onBack} style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #E9ECEF', backgroundColor: '#FFFFFF', cursor: 'pointer', fontSize: 13, color: '#6C757D', fontWeight: 600 }}>← Retour</button>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#2C3E50' }}>{title}</h1>
        </div>
        {children}
      </div>
    </div>
  );
}

function QrScannerScreen({ onScan, onBack, started }: { onScan: (token: string) => void; onBack: () => void; started: boolean }) {
  const scannerRef = (globalThis as any).__coroScanner;
  const divId = 'coro-qr-reader';

  useEffect(() => {
    if (!started) return;
    let scanner: any = null;
    const initScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        scanner = new Html5Qrcode(divId);
        (globalThis as any).__coroScanner = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
                      (decodedText: string) => {
              // Extraire le token — que ce soit une URL ou un token brut
              let qrToken = decodedText.trim();
              if (qrToken.includes('/')) {
                const parts = qrToken.split('/');
                qrToken = parts[parts.length - 1];
              }
              // Ignorer si vide ou trop court
              if (!qrToken || qrToken.length < 10) return;
              scanner.stop().catch(() => {});
              onScan(qrToken);
            },
          () => {}
        );
      } catch (err) {
        console.error('[CORO Scanner]', err);
      }
    };
    initScanner();
    return () => {
      if (scanner) scanner.stop().catch(() => {});
    };
  }, [started]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#2C3E50', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#ADB5BD', textTransform: 'uppercase', letterSpacing: '0.1em' }}>CORO Sentinelle</p>
      <h2 style={{ margin: '0 0 24px', fontSize: 22, fontWeight: 800, color: '#FFFFFF' }}>Scanner votre QR Code</h2>
      <div style={{ width: 300, height: 300, borderRadius: 16, overflow: 'hidden', border: '3px solid rgba(255,255,255,0.2)', backgroundColor: '#000' }}>
        <div id={divId} style={{ width: '100%', height: '100%' }} />
      </div>
      <p style={{ margin: '20px 0', fontSize: 13, color: '#ADB5BD', textAlign: 'center' }}>
        Pointez la caméra vers votre code QR
      </p>
      <button type="button" onClick={onBack}
        style={{ padding: '12px 24px', borderRadius: 10, border: '2px solid rgba(255,255,255,0.2)', backgroundColor: 'transparent', color: '#FFFFFF', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
        ← Retour
      </button>
    </div>
  );
}

function KioskInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#6C757D', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '14px 16px', borderRadius: 10, border: '2px solid #E9ECEF', fontSize: 16, backgroundColor: '#FFFFFF', outline: 'none', boxSizing: 'border-box' }} />
    </div>
  );
}