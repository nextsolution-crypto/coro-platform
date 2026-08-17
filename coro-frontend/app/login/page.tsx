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
  const [view, setView] = useState<'login' | 'forgot' | 'forgot-sent'>('login');
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

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

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: resetEmail });
    } catch (err) {
      // On affiche toujours le succès pour ne pas révéler si l'email existe
    } finally {
      setResetLoading(false);
      setView('forgot-sent');
    }
  };

  const inputStyle = {
    backgroundColor: '#FFFFFF',
    border: '1px solid #CED4DA',
    color: '#2C3E50',
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 sm:py-12"
      style={{ backgroundColor: '#F8F9FA' }}>
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-6 sm:mb-8 px-2">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: '#2C3E50' }}>
            CO<span style={{ color: '#C0392B' }}>RO</span>
          </h1>
          <p className="mt-2 text-xs sm:text-sm leading-relaxed" style={{ color: '#6C757D' }}>
            Conformité opérationnelle et résilience organisationnelle
          </p>
        </div>

        {/* Carte */}
        <div className="bg-white rounded-md p-5 sm:p-8"
          style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.08)', border: '1px solid #E9ECEF' }}>

          {/* ── VUE CONNEXION ── */}
          {view === 'login' && (
            <>
              <h2 className="text-xl font-semibold mb-6" style={{ color: '#2C3E50' }}>Connexion</h2>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm mb-1.5 font-medium" style={{ color: '#495057' }}>
                    Adresse courriel
                  </label>
                  <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="votre@courriel.com" autoComplete="email" inputMode="email" required
                    className="w-full min-w-0 rounded px-4 py-3 text-sm transition-colors focus:outline-none"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#C0392B'}
                    onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="block text-sm font-medium" style={{ color: '#495057' }}>
                      Mot de passe
                    </label>
                    <button type="button" onClick={() => { setResetEmail(email); setView('forgot'); }}
                      className="text-xs transition-colors"
                      style={{ color: '#2980B9', background: 'none', border: 'none', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#1A5276'}
                      onMouseLeave={e => e.currentTarget.style.color = '#2980B9'}>
                      Mot de passe oublié ?
                    </button>
                  </div>
                  <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" autoComplete="current-password" required
                    className="w-full min-w-0 rounded px-4 py-3 text-sm transition-colors focus:outline-none"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#C0392B'}
                    onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                </div>
                {error && (
                  <div className="rounded px-4 py-3" style={{ backgroundColor: '#FDEDEC', border: '1px solid #F1948A' }}>
                    <p className="text-sm break-words" style={{ color: '#C0392B' }}>{error}</p>
                  </div>
                )}
                <button type="submit" disabled={loading}
                  className="w-full text-white font-semibold rounded px-4 py-3 text-sm transition-colors mt-2"
                  style={{ backgroundColor: loading ? '#E8A89C' : '#C0392B', cursor: loading ? 'not-allowed' : 'pointer' }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = '#A93226'; }}
                  onMouseLeave={e => { if (!loading) e.currentTarget.style.backgroundColor = '#C0392B'; }}>
                  {loading ? 'Connexion...' : 'Se connecter'}
                </button>
              </form>
            </>
          )}

          {/* ── VUE MOT DE PASSE OUBLIÉ ── */}
          {view === 'forgot' && (
            <>
              <button onClick={() => setView('login')}
                className="flex items-center gap-1 text-sm mb-5 transition-colors"
                style={{ color: '#6C757D', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                onMouseEnter={e => e.currentTarget.style.color = '#2C3E50'}
                onMouseLeave={e => e.currentTarget.style.color = '#6C757D'}>
                ← Retour à la connexion
              </button>
              <h2 className="text-xl font-semibold mb-2" style={{ color: '#2C3E50' }}>Mot de passe oublié</h2>
              <p className="text-sm mb-6" style={{ color: '#6C757D' }}>
                Entrez votre adresse courriel. Si un compte existe, vous recevrez un lien de réinitialisation valide 24h.
              </p>
              <form onSubmit={handleForgot} className="space-y-4">
                <div>
                  <label className="block text-sm mb-1.5 font-medium" style={{ color: '#495057' }}>
                    Adresse courriel
                  </label>
                  <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)}
                    placeholder="votre@courriel.com" required
                    className="w-full rounded px-4 py-3 text-sm focus:outline-none"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#C0392B'}
                    onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                </div>
                <button type="submit" disabled={resetLoading}
                  className="w-full text-white font-semibold rounded px-4 py-3 text-sm transition-colors"
                  style={{ backgroundColor: resetLoading ? '#E8A89C' : '#C0392B', cursor: resetLoading ? 'not-allowed' : 'pointer' }}
                  onMouseEnter={e => { if (!resetLoading) e.currentTarget.style.backgroundColor = '#A93226'; }}
                  onMouseLeave={e => { if (!resetLoading) e.currentTarget.style.backgroundColor = '#C0392B'; }}>
                  {resetLoading ? 'Envoi...' : 'Envoyer le lien de réinitialisation'}
                </button>
              </form>
            </>
          )}

          {/* ── VUE CONFIRMATION ENVOI ── */}
          {view === 'forgot-sent' && (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">📧</div>
              <h2 className="text-xl font-semibold mb-2" style={{ color: '#2C3E50' }}>Courriel envoyé !</h2>
              <p className="text-sm mb-6" style={{ color: '#6C757D' }}>
                Si un compte est associé à <strong>{resetEmail}</strong>, vous recevrez un lien de réinitialisation sous peu. Vérifiez aussi vos indésirables.
              </p>
              <button onClick={() => setView('login')}
                className="text-white font-medium rounded px-5 py-2.5 text-sm"
                style={{ backgroundColor: '#C0392B' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#A93226'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#C0392B'}>
                Retour à la connexion
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs mt-6 px-2" style={{ color: '#ADB5BD' }}>
          CORO v1.0 — 2026
        </p>
      </div>
    </div>
  );
}