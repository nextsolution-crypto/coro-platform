'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

function MagicLinkHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const res = await fetch(`${API_URL}/client-auth/magic-link/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) throw await res.json();
      const { token: jwtToken, user } = await res.json();
      localStorage.setItem('coro_client_token', jwtToken);
      localStorage.setItem('coro_client_user', JSON.stringify(user));
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Lien invalide ou expiré.');
    }
  };

  if (error) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#F8F9FA' }}>
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-md p-8" style={{ border: '1px solid #E9ECEF', boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }}>
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: '#2C3E50' }}>Lien invalide ou expiré</h2>
          <p className="text-sm mb-6" style={{ color: '#6C757D' }}>{error}</p>
          <button onClick={() => router.push('/login')}
            className="text-white font-medium rounded px-5 py-2.5 text-sm"
            style={{ backgroundColor: '#C0392B' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#A93226'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#C0392B'}>
            Se connecter normalement
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F9FA' }}>
      <div className="text-center">
        <div className="text-4xl mb-4 animate-pulse">🔐</div>
        <p className="text-sm" style={{ color: '#6C757D' }}>Connexion en cours...</p>
      </div>
    </div>
  );
}

export default function MagicPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F9FA' }}>
        <p className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>Chargement...</p>
      </div>
    }>
      <MagicLinkHandler />
    </Suspense>
  );
}