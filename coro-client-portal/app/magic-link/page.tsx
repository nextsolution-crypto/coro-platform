'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';
const NEUTRAL =
  'Si un compte actif correspond à cette adresse, un lien de connexion vous sera envoyé.';

export default function MagicLinkRequestPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await fetch(`${API_URL}/client-auth/magic-link/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
    } catch {
      // La réponse demeure neutre afin de ne pas révéler l'existence du compte.
    } finally {
      setDone(true);
      setBusy(false);
    }
  }

  return (
    <main className="authReset">
      <section>
        <Link href="/login">CORO · Portail Client</Link>
        <h1>Lien de connexion</h1>
        {done ? (
          <p role="status">{NEUTRAL}</p>
        ) : (
          <form onSubmit={submit}>
            <label htmlFor="magic-email">Adresse courriel</label>
            <input
              id="magic-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <button type="submit" disabled={busy}>
              {busy ? 'Envoi...' : 'Envoyer le lien'}
            </button>
          </form>
        )}
        <Link href="/login">Retour à la connexion</Link>
      </section>
    </main>
  );
}
