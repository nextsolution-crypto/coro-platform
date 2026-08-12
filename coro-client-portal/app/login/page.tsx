'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setAuth } from '../store/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!form.email || !form.password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/client-auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Email ou mot de passe invalide.');
        return;
      }
      setAuth(data.token, data.user);
      router.push('/dashboard');
    } catch {
      setError('Erreur de connexion. Vérifiez votre connexion internet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#F8F9FA', padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#2C3E50', letterSpacing: '-2px', marginBottom: 8 }}>
            CO<span style={{ color: '#C0392B' }}>RO</span>
          </div>
          <p style={{ fontSize: 15, color: '#6C757D' }}>Portail Client</p>
        </div>

        {/* Card */}
        <div style={{
          backgroundColor: '#FFFFFF', borderRadius: 12, padding: 40,
          border: '1px solid #E9ECEF', boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#2C3E50', marginBottom: 8 }}>
            Connexion
          </h1>
          <p style={{ fontSize: 14, color: '#6C757D', marginBottom: 32 }}>
            Accédez à vos documents de conformité.
          </p>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#495057', marginBottom: 6 }}>
              Courriel
            </label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="votre@courriel.com"
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 6,
                border: '1px solid #DEE2E6', fontSize: 15, color: '#2C3E50',
                backgroundColor: '#FFFFFF', outline: 'none', boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = '#C0392B'}
              onBlur={e => e.target.style.borderColor = '#DEE2E6'}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#495057', marginBottom: 6 }}>
              Mot de passe
            </label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 6,
                border: '1px solid #DEE2E6', fontSize: 15, color: '#2C3E50',
                backgroundColor: '#FFFFFF', outline: 'none', boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = '#C0392B'}
              onBlur={e => e.target.style.borderColor = '#DEE2E6'}
            />
          </div>

          {error && (
            <div style={{
              backgroundColor: '#FDEDEC', border: '1px solid #F1948A',
              borderRadius: 6, padding: '10px 14px', marginBottom: 16,
            }}>
              <p style={{ fontSize: 13, color: '#C0392B' }}>{error}</p>
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: '100%', padding: '14px', borderRadius: 6,
              backgroundColor: loading ? '#ADB5BD' : '#C0392B',
              color: '#FFFFFF', border: 'none', fontSize: 15, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer', transition: 'background-color 0.2s',
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = '#A93226'; }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.backgroundColor = '#C0392B'; }}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#ADB5BD', marginTop: 24 }}>
          Problème de connexion ? Contactez votre conseiller CORO.
        </p>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#DEE2E6', marginTop: 16 }}>
          © 2026 CORO — <a href="https://getcoro.io" style={{ color: '#DEE2E6' }}>getcoro.io</a>
        </p>
      </div>
    </div>
  );
}