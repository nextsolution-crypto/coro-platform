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

  const [view, setView] = useState<'login' | 'forgot' | 'forgot-sent' | 'mfa'>('login');

  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/auth/login', {
        email: email.trim(),
        password,
      });
      if (response.data.mfaRequired) {
        setView('mfa');
        return;
      }
      const { access_token, user } = response.data;
      setAuth(user, access_token);
      router.push('/dashboard');
    } catch (err: any) {
      setError('Email ou mot de passe invalide');
    } finally {
      setLoading(false);
    }
  };

  const handleMfa = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (mfaLoading) return;
    setMfaLoading(true);
    setError('');
    try {
      const response = await api.post('/auth/verify-mfa', {
        email: email.trim(),
        code: mfaCode.trim(),
      });
      const { access_token, user } = response.data;
      setAuth(user, access_token);
      router.push('/dashboard');
    } catch (err: any) {
      setError('Code invalide ou expiré. Veuillez réessayer.');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (resetLoading) return;

    setResetLoading(true);

    try {
      await api.post('/auth/forgot-password', {
        email: resetEmail.trim(),
      });
    } catch (err) {
      // Toujours afficher le succès afin de ne pas révéler
      // si l'adresse courriel existe dans le système.
    } finally {
      setResetLoading(false);
      setView('forgot-sent');
    }
  };

  const inputStyle: React.CSSProperties = {
    backgroundColor: '#FFFFFF',
    border: '1px solid #CED4DA',
    color: '#2C3E50',
  };

  const goToForgot = () => {
    setError('');
    setResetEmail(email);
    setView('forgot');
  };

  const goToLogin = () => {
    setError('');
    setPassword('');
    setView('login');
  };

  return (
    <main
      className="
        min-h-screen
        min-h-[100dvh]
        flex
        items-center
        justify-center
        px-4
        py-6
        sm:py-10
      "
      style={{ backgroundColor: '#F8F9FA' }}
    >
      <div className="w-full max-w-md">

        {/* ─────────────────────────────────────
            LOGO
        ───────────────────────────────────── */}
        <div className="text-center mb-6 sm:mb-8 px-2">
          <h1
            className="
              text-3xl
              sm:text-4xl
              font-bold
              tracking-tight
            "
            style={{ color: '#2C3E50' }}
          >
            CO<span style={{ color: '#C0392B' }}>RO</span>
          </h1>

          <p
            className="
              mt-2
              text-xs
              sm:text-sm
              leading-relaxed
              max-w-sm
              mx-auto
            "
            style={{ color: '#6C757D' }}
          >
            Conformité opérationnelle et résilience organisationnelle
          </p>
        </div>


        {/* ─────────────────────────────────────
            CARTE
        ───────────────────────────────────── */}
        <section
          className="
            bg-white
            rounded-lg
            p-5
            sm:p-8
            overflow-hidden
          "
          style={{
            boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
            border: '1px solid #E9ECEF',
          }}
        >

          {/* ═══════════════════════════════════
              CONNEXION
          ═══════════════════════════════════ */}
          {view === 'login' && (
            <>
              <h2
                className="text-xl font-semibold mb-6"
                style={{ color: '#2C3E50' }}
              >
                Connexion
              </h2>

              <form onSubmit={handleLogin} className="space-y-5">

                {/* COURRIEL */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm mb-1.5 font-medium"
                    style={{ color: '#495057' }}
                  >
                    Adresse courriel
                  </label>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="votre@courriel.com"
                    autoComplete="email"
                    inputMode="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                    disabled={loading}
                    className="
                      w-full
                      min-w-0
                      rounded
                      px-4
                      py-3
                      text-base
                      sm:text-sm
                      transition-colors
                      focus:outline-none
                      disabled:opacity-60
                    "
                    style={inputStyle}
                    onFocus={e => {
                      e.currentTarget.style.borderColor = '#C0392B';
                    }}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = '#CED4DA';
                    }}
                  />
                </div>


                {/* MOT DE PASSE */}
                <div>
                  <div
                    className="
                      flex
                      flex-wrap
                      items-center
                      justify-between
                      gap-x-3
                      gap-y-1
                      mb-1.5
                    "
                  >
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium"
                      style={{ color: '#495057' }}
                    >
                      Mot de passe
                    </label>

                    <button
                      type="button"
                      onClick={goToForgot}
                      disabled={loading}
                      className="
                        text-xs
                        sm:text-sm
                        transition-colors
                        min-h-[32px]
                        disabled:opacity-50
                      "
                      style={{
                        color: '#2980B9',
                        background: 'none',
                        border: 'none',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        padding: 0,
                      }}
                      onMouseEnter={e => {
                        if (!loading) {
                          e.currentTarget.style.color = '#1A5276';
                        }
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.color = '#2980B9';
                      }}
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>

                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    disabled={loading}
                    className="
                      w-full
                      min-w-0
                      rounded
                      px-4
                      py-3
                      text-base
                      sm:text-sm
                      transition-colors
                      focus:outline-none
                      disabled:opacity-60
                    "
                    style={inputStyle}
                    onFocus={e => {
                      e.currentTarget.style.borderColor = '#C0392B';
                    }}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = '#CED4DA';
                    }}
                  />
                </div>


                {/* ERREUR */}
                <div
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {error && (
                    <div
                      className="rounded px-4 py-3"
                      style={{
                        backgroundColor: '#FDEDEC',
                        border: '1px solid #F1948A',
                      }}
                    >
                      <p
                        className="text-sm break-words"
                        style={{ color: '#C0392B' }}
                      >
                        {error}
                      </p>
                    </div>
                  )}
                </div>


                {/* BOUTON CONNEXION */}
                <button
                  type="submit"
                  disabled={loading}
                  className="
                    w-full
                    min-h-[48px]
                    text-white
                    font-semibold
                    rounded
                    px-4
                    py-3
                    text-sm
                    transition-colors
                    mt-1
                    disabled:cursor-not-allowed
                  "
                  style={{
                    backgroundColor: loading ? '#E8A89C' : '#C0392B',
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                  onMouseEnter={e => {
                    if (!loading) {
                      e.currentTarget.style.backgroundColor = '#A93226';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!loading) {
                      e.currentTarget.style.backgroundColor = '#C0392B';
                    }
                  }}
                >
                  {loading ? 'Connexion...' : 'Se connecter'}
                </button>

              </form>
            </>
          )}


          {/* ═══════════════════════════════════
              MFA
          ═══════════════════════════════════ */}
          {view === 'mfa' && (
            <>
              <div className="text-center mb-6">
                <div className="text-4xl mb-3">🔐</div>
                <h2 className="text-xl font-semibold mb-2" style={{ color: '#2C3E50' }}>
                  Vérification en deux étapes
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: '#6C757D' }}>
                  Un code à 6 chiffres a été envoyé à<br />
                  <strong style={{ color: '#2C3E50' }}>{email}</strong>
                </p>
              </div>

              <form onSubmit={handleMfa} className="space-y-5">
                <div>
                  <label htmlFor="mfa-code" className="block text-sm mb-1.5 font-medium" style={{ color: '#495057' }}>
                    Code de vérification
                  </label>
                  <input
                    id="mfa-code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={mfaCode}
                    onChange={e => setMfaCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    autoComplete="one-time-code"
                    required
                    disabled={mfaLoading}
                    className="w-full min-w-0 rounded px-4 py-3 text-center text-2xl font-bold tracking-widest focus:outline-none disabled:opacity-60"
                    style={{ ...inputStyle, letterSpacing: '0.3em' }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#C0392B'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#CED4DA'; }}
                  />
                  <p className="text-xs mt-2 text-center" style={{ color: '#ADB5BD' }}>
                    Code valide pendant 10 minutes
                  </p>
                </div>

                {error && (
                  <div className="rounded px-4 py-3" style={{ backgroundColor: '#FDEDEC', border: '1px solid #F1948A' }}>
                    <p className="text-sm" style={{ color: '#C0392B' }}>{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={mfaLoading || mfaCode.length !== 6}
                  className="w-full min-h-[48px] text-white font-semibold rounded px-4 py-3 text-sm transition-colors disabled:cursor-not-allowed"
                  style={{ backgroundColor: mfaLoading || mfaCode.length !== 6 ? '#E8A89C' : '#C0392B' }}
                  onMouseEnter={e => { if (!mfaLoading && mfaCode.length === 6) e.currentTarget.style.backgroundColor = '#A93226'; }}
                  onMouseLeave={e => { if (!mfaLoading && mfaCode.length === 6) e.currentTarget.style.backgroundColor = '#C0392B'; }}
                >
                  {mfaLoading ? 'Vérification...' : 'Vérifier le code'}
                </button>

                <button
                  type="button"
                  onClick={() => { setView('login'); setMfaCode(''); setError(''); }}
                  className="w-full text-sm min-h-[40px] transition-colors"
                  style={{ color: '#6C757D', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  ← Retour à la connexion
                </button>
              </form>
            </>
          )}

          {/* ═══════════════════════════════════
              MOT DE PASSE OUBLIÉ
          ═══════════════════════════════════ */}
          {view === 'forgot' && (
            <>
              <button
                type="button"
                onClick={goToLogin}
                className="
                  inline-flex
                  items-center
                  gap-1
                  text-sm
                  mb-5
                  min-h-[36px]
                  transition-colors
                "
                style={{
                  color: '#6C757D',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = '#2C3E50';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = '#6C757D';
                }}
              >
                ← Retour à la connexion
              </button>

              <h2
                className="text-xl font-semibold mb-2"
                style={{ color: '#2C3E50' }}
              >
                Mot de passe oublié
              </h2>

              <p
                className="text-sm leading-relaxed mb-6"
                style={{ color: '#6C757D' }}
              >
                Entrez votre adresse courriel. Si un compte existe,
                vous recevrez un lien de réinitialisation valide 24 h.
              </p>

              <form onSubmit={handleForgot} className="space-y-5">

                <div>
                  <label
                    htmlFor="reset-email"
                    className="block text-sm mb-1.5 font-medium"
                    style={{ color: '#495057' }}
                  >
                    Adresse courriel
                  </label>

                  <input
                    id="reset-email"
                    name="reset-email"
                    type="email"
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    placeholder="votre@courriel.com"
                    autoComplete="email"
                    inputMode="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                    disabled={resetLoading}
                    className="
                      w-full
                      min-w-0
                      rounded
                      px-4
                      py-3
                      text-base
                      sm:text-sm
                      focus:outline-none
                      transition-colors
                      disabled:opacity-60
                    "
                    style={inputStyle}
                    onFocus={e => {
                      e.currentTarget.style.borderColor = '#C0392B';
                    }}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = '#CED4DA';
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="
                    w-full
                    min-h-[48px]
                    text-white
                    font-semibold
                    rounded
                    px-4
                    py-3
                    text-sm
                    transition-colors
                    disabled:cursor-not-allowed
                  "
                  style={{
                    backgroundColor: resetLoading ? '#E8A89C' : '#C0392B',
                    cursor: resetLoading ? 'not-allowed' : 'pointer',
                  }}
                  onMouseEnter={e => {
                    if (!resetLoading) {
                      e.currentTarget.style.backgroundColor = '#A93226';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!resetLoading) {
                      e.currentTarget.style.backgroundColor = '#C0392B';
                    }
                  }}
                >
                  {resetLoading
                    ? 'Envoi...'
                    : 'Envoyer le lien de réinitialisation'}
                </button>

              </form>
            </>
          )}


          {/* ═══════════════════════════════════
              CONFIRMATION
          ═══════════════════════════════════ */}
          {view === 'forgot-sent' && (
            <div
              className="text-center py-3 sm:py-4"
              aria-live="polite"
              aria-atomic="true"
            >
              <div
                className="text-5xl mb-4"
                aria-hidden="true"
              >
                📧
              </div>

              <h2
                className="text-xl font-semibold mb-2"
                style={{ color: '#2C3E50' }}
              >
                Courriel envoyé !
              </h2>

              <p
                className="
                  text-sm
                  leading-relaxed
                  mb-6
                  break-words
                "
                style={{ color: '#6C757D' }}
              >
                Si un compte est associé à{' '}
                <strong>{resetEmail}</strong>, vous recevrez un lien
                de réinitialisation sous peu. Vérifiez aussi vos indésirables.
              </p>

              <button
                type="button"
                onClick={goToLogin}
                className="
                  w-full
                  sm:w-auto
                  min-h-[46px]
                  text-white
                  font-medium
                  rounded
                  px-5
                  py-2.5
                  text-sm
                  transition-colors
                "
                style={{
                  backgroundColor: '#C0392B',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = '#A93226';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = '#C0392B';
                }}
              >
                Retour à la connexion
              </button>
            </div>
          )}

        </section>


        {/* ─────────────────────────────────────
            VERSION
        ───────────────────────────────────── */}
        <p
          className="
            text-center
            text-xs
            mt-5
            sm:mt-6
            px-2
          "
          style={{ color: '#ADB5BD' }}
        >
          CORO v1.0 — 2026
        </p>

      </div>
    </main>
  );
}