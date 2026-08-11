'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/auth/login', { email, password });
      const { access_token, user } = response.data;
      setAuth(user, access_token);
      router.push('/dashboard');
    } catch (err: any) {
      setError('Email ou mot de passe invalide');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#F8F9FA' }}>
      <div className="w-full max-w-md px-4">

        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight"
            style={{ color: '#2C3E50' }}>
            CO<span style={{ color: '#C0392B' }}>RO</span>
          </h1>
          <p className="mt-2 text-sm" style={{ color: '#6C757D' }}>
            Conformité opérationnelle et résilience organisationnelle
          </p>
        </div>

        {/* Carte */}
        <div className="bg-white rounded-md p-8"
          style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.08)', border: '1px solid #E9ECEF' }}>

          <h2 className="text-xl font-semibold mb-6" style={{ color: '#2C3E50' }}>
            Connexion
          </h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm mb-1.5 font-medium"
                style={{ color: '#495057' }}>
                Adresse courriel
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="votre@courriel.com"
                required
                className="w-full rounded px-4 py-3 text-sm transition-colors
                  focus:outline-none"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CED4DA',
                  color: '#2C3E50',
                }}
                onFocus={e => e.target.style.borderColor = '#C0392B'}
                onBlur={e => e.target.style.borderColor = '#CED4DA'}
              />
            </div>

            <div>
              <label className="block text-sm mb-1.5 font-medium"
                style={{ color: '#495057' }}>
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded px-4 py-3 text-sm transition-colors
                  focus:outline-none"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CED4DA',
                  color: '#2C3E50',
                }}
                onFocus={e => e.target.style.borderColor = '#C0392B'}
                onBlur={e => e.target.style.borderColor = '#CED4DA'}
              />
            </div>

            {error && (
              <div className="rounded px-4 py-3"
                style={{ backgroundColor: '#FDEDEC', border: '1px solid #F1948A' }}>
                <p className="text-sm" style={{ color: '#C0392B' }}>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-semibold rounded px-4 py-3
                text-sm transition-colors mt-2"
              style={{
                backgroundColor: loading ? '#E8A89C' : '#C0392B',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={e => {
                if (!loading) (e.target as HTMLElement).style.backgroundColor = '#A93226';
              }}
              onMouseLeave={e => {
                if (!loading) (e.target as HTMLElement).style.backgroundColor = '#C0392B';
              }}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: '#ADB5BD' }}>
          CORO v1.0 — 2026
        </p>
      </div>
    </div>
  );
}