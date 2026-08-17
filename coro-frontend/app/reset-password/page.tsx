'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) router.push('/login');
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return; }
    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return; }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/reset-password', { token, password });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Lien invalide ou expiré. Veuillez refaire une demande.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { backgroundColor: '#FFFFFF', border: '1px solid #CED4DA', color: '#2C3E50' };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ backgroundColor: '#F8F9FA' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold" style={{ color: '#2C3E50' }}>
            CO<span style={{ color: '#C0392B' }}>RO</span>
          </h1>
          <p className="mt-2 text-sm" style={{ color: '#6C757D' }}>Conformité opérationnelle et résilience organisationnelle</p>
        </div>

        <div className="bg-white rounded-md p-8" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.08)', border: '1px solid #E9ECEF' }}>
          {success ? (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-xl font-semibold mb-2" style={{ color: '#2C3E50' }}>Mot de passe mis à jour !</h2>
              <p className="text-sm mb-6" style={{ color: '#6C757D' }}>Votre mot de passe a été réinitialisé avec succès.</p>
              <button onClick={() => router.push('/login')}
                className="text-white font-medium rounded px-5 py-2.5 text-sm"
                style={{ backgroundColor: '#C0392B' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#A93226'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#C0392B'}>
                Se connecter →
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold mb-2" style={{ color: '#2C3E50' }}>Nouveau mot de passe</h2>
              <p className="text-sm mb-6" style={{ color: '#6C757D' }}>Choisissez un nouveau mot de passe pour votre compte CORO.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>Nouveau mot de passe</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Minimum 8 caractères" required minLength={8}
                    className="w-full rounded px-4 py-3 text-sm focus:outline-none"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#C0392B'}
                    onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>Confirmer le mot de passe</label>
                  <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                    placeholder="Répétez le mot de passe" required
                    className="w-full rounded px-4 py-3 text-sm focus:outline-none"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#C0392B'}
                    onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                </div>
                {error && (
                  <div className="rounded px-4 py-3" style={{ backgroundColor: '#FDEDEC', border: '1px solid #F1948A' }}>
                    <p className="text-sm" style={{ color: '#C0392B' }}>{error}</p>
                  </div>
                )}
                <button type="submit" disabled={loading}
                  className="w-full text-white font-semibold rounded px-4 py-3 text-sm transition-colors"
                  style={{ backgroundColor: loading ? '#E8A89C' : '#C0392B', cursor: loading ? 'not-allowed' : 'pointer' }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = '#A93226'; }}
                  onMouseLeave={e => { if (!loading) e.currentTarget.style.backgroundColor = '#C0392B'; }}>
                  {loading ? 'Mise à jour...' : 'Réinitialiser le mot de passe'}
                </button>
              </form>
            </>
          )}
        </div>
        <p className="text-center text-xs mt-6" style={{ color: '#ADB5BD' }}>CORO v1.0 — 2026</p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>Chargement...</p></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}