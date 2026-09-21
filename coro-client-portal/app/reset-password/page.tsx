'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';
const INVALID = "Ce lien de réinitialisation est invalide ou n'est plus disponible.";

export default function ResetPasswordPage() {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    setToken(url.searchParams.get('token'));
    window.history.replaceState(window.history.state, '', url.pathname);
    setReady(true);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !token) return;
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return; }
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/client-auth/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      if (!response.ok) {
        if (response.status === 400) {
          const body = await response.json().catch(() => null);
          if (typeof body?.message === 'string' && body.message.startsWith('Le mot de passe')) {
            setError(body.message);
            return;
          }
        }
        setError(INVALID);
        return;
      }
      setToken(null);
      setPassword('');
      setConfirm('');
      setDone(true);
    } catch {
      setError('Connexion indisponible. Réessayez.');
    } finally {
      setBusy(false);
    }
  }

  return <main className="authReset"><section>
    <Link href="/login">CORO · Portail Client</Link>
    <h1>Réinitialiser le mot de passe</h1>
    {done ? <p role="status">Votre mot de passe a été réinitialisé. Vous pouvez maintenant vous connecter.</p>
      : ready && !token ? <p role="alert">{INVALID}</p>
      : ready ? <form onSubmit={submit}>
        <label htmlFor="new-password">Nouveau mot de passe</label>
        <input id="new-password" type="password" autoComplete="new-password" required value={password} onChange={e => setPassword(e.target.value)} />
        <label htmlFor="confirm-password">Confirmer le mot de passe</label>
        <input id="confirm-password" type="password" autoComplete="new-password" required value={confirm} onChange={e => setConfirm(e.target.value)} />
        <p>8 caractères minimum, dont une majuscule, une minuscule, un chiffre et un caractère spécial.</p>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={busy}>{busy ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}</button>
      </form> : null}
    <Link href="/login">Retour à la connexion</Link>
  </section></main>;
}
