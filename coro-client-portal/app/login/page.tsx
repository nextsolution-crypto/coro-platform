'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setAuth } from '../store/auth';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

export default function LoginPage() {
  const router = useRouter();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'login' | 'mfa'>('login');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);

  const handleLogin = async () => {
    if (!form.email || !form.password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const trustedToken = localStorage.getItem(`coro_client_trusted_${form.email.trim()}`);
      const res = await fetch(`${API_URL}/client-auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, ...(trustedToken ? { trustedToken } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Email ou mot de passe invalide.');
        return;
      }
      if (data.mfaRequired) {
        setView('mfa');
        return;
      }
      setAuth(data.token, data.user);
      router.replace('/dashboard');
    } catch {
      setError('Erreur de connexion. Vérifiez votre connexion internet.');
    } finally {
      setLoading(false);
    }
  };

  const handleMfa = async () => {
    if (mfaCode.length !== 6) return;
    setMfaLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/client-auth/verify-mfa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email.trim(), code: mfaCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Code invalide ou expiré.');
        return;
      }
      if (data.trusted_token) {
        localStorage.setItem(`coro_client_trusted_${form.email.trim()}`, data.trusted_token);
      }
      setAuth(data.token, data.user);
      router.replace('/dashboard');
    } catch {
      setError('Erreur de connexion. Vérifiez votre connexion internet.');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loading) handleLogin();
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    minHeight: 48,
    padding: '12px 14px',
    borderRadius: 7,
    border: '1px solid #DEE2E6',
    fontSize: 16,
    color: '#2C3E50',
    backgroundColor: '#FFFFFF',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8F9FA',
        padding: '24px 16px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 'clamp(32px, 9vw, 36px)', fontWeight: 900, color: '#2C3E50', letterSpacing: '-2px', marginBottom: 8 }}>
            CO<span style={{ color: '#C0392B' }}>RO</span>
          </div>
          <p style={{ margin: 0, fontSize: 15, color: '#6C757D' }}>Portail Client</p>
        </div>

        {/* Carte */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 'clamp(24px, 6vw, 40px)', border: '1px solid #E9ECEF', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>

          {/* ── VUE LOGIN ── */}
          {view === 'login' && (
            <>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#2C3E50', margin: '0 0 8px' }}>Connexion</h1>
              <p style={{ fontSize: 14, color: '#6C757D', margin: '0 0 28px', lineHeight: 1.5 }}>Accédez à vos documents de conformité.</p>

              <form onSubmit={handleSubmit}>
                {/* Courriel */}
                <div style={{ marginBottom: 16 }}>
                  <label htmlFor="email" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#495057', marginBottom: 6 }}>Courriel</label>
                  <input
                    id="email" name="email" type="email" inputMode="email" autoComplete="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="votre@courriel.com" required
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#C0392B'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(192,57,43,0.10)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#DEE2E6'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>

                {/* Mot de passe */}
                <div style={{ marginBottom: 24 }}>
                  <label htmlFor="password" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#495057', marginBottom: 6 }}>Mot de passe</label>
                  <input
                    id="password" name="password" type="password" autoComplete="current-password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••" required
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#C0392B'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(192,57,43,0.10)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#DEE2E6'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>

                {error && (
                  <div role="alert" style={{ backgroundColor: '#FDEDEC', border: '1px solid #F1948A', borderRadius: 7, padding: '11px 14px', marginBottom: 16 }}>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: '#C0392B' }}>{error}</p>
                  </div>
                )}

                <button
                  type="submit" disabled={loading}
                  style={{ width: '100%', minHeight: 48, padding: '13px 16px', borderRadius: 7, backgroundColor: loading ? '#ADB5BD' : '#C0392B', color: '#FFFFFF', border: 'none', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background-color 0.2s' }}
                  onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#A93226'; }}
                  onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#C0392B'; }}
                >
                  {loading ? 'Connexion...' : 'Se connecter'}
                </button>
              </form>
            </>
          )}

          {/* ── VUE MFA ── */}
          {view === 'mfa' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔐</div>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: '#2C3E50', margin: '0 0 8px' }}>Vérification en deux étapes</h1>
                <p style={{ fontSize: 14, color: '#6C757D', margin: 0, lineHeight: 1.5 }}>
                  Un code à 6 chiffres a été envoyé à<br />
                  <strong style={{ color: '#2C3E50' }}>{form.email}</strong>
                </p>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label htmlFor="mfa-code" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#495057', marginBottom: 6 }}>Code de vérification</label>
                <input
                  id="mfa-code" type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456" autoComplete="one-time-code"
                  style={{ ...inputStyle, textAlign: 'center', fontSize: 28, fontWeight: 700, letterSpacing: '0.3em' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#C0392B'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(192,57,43,0.10)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#DEE2E6'; e.currentTarget.style.boxShadow = 'none'; }}
                />
                <p style={{ margin: '8px 0 0', fontSize: 12, color: '#ADB5BD', textAlign: 'center' }}>Code valide pendant 10 minutes</p>
              </div>

              {error && (
                <div role="alert" style={{ backgroundColor: '#FDEDEC', border: '1px solid #F1948A', borderRadius: 7, padding: '11px 14px', marginBottom: 16 }}>
                  <p style={{ margin: 0, fontSize: 13, color: '#C0392B' }}>{error}</p>
                </div>
              )}

              <button
                type="button"
                onClick={handleMfa}
                disabled={mfaLoading || mfaCode.length !== 6}
                style={{ width: '100%', minHeight: 48, padding: '13px 16px', borderRadius: 7, backgroundColor: mfaLoading || mfaCode.length !== 6 ? '#ADB5BD' : '#C0392B', color: '#FFFFFF', border: 'none', fontSize: 15, fontWeight: 700, cursor: mfaLoading || mfaCode.length !== 6 ? 'not-allowed' : 'pointer', transition: 'background-color 0.2s', marginBottom: 12 }}
                onMouseEnter={(e) => { if (!mfaLoading && mfaCode.length === 6) e.currentTarget.style.backgroundColor = '#A93226'; }}
                onMouseLeave={(e) => { if (!mfaLoading && mfaCode.length === 6) e.currentTarget.style.backgroundColor = '#C0392B'; }}
              >
                {mfaLoading ? 'Vérification...' : 'Vérifier le code'}
              </button>

              <button
                type="button"
                onClick={() => { setView('login'); setMfaCode(''); setError(''); }}
                style={{ width: '100%', minHeight: 40, fontSize: 13, color: '#6C757D', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                ← Retour à la connexion
              </button>
            </>
          )}

        </div>

        <p style={{ textAlign: 'center', fontSize: 13, lineHeight: 1.5, color: '#ADB5BD', margin: '24px 0 0', padding: '0 8px' }}>
          Problème de connexion ? Contactez votre conseiller CORO.
        </p>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#CED4DA', margin: '16px 0 0' }}>
          © 2026 CORO —{' '}
          <a href="https://getcoro.io" style={{ color: '#ADB5BD', textDecoration: 'none' }}>getcoro.io</a>
        </p>

      </div>
    </main>
  );
}