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
    if (!token) {
      router.push('/login');
    }
  }, [token, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (loading) return;

    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/auth/reset-password', {
        token,
        password,
      });

      setSuccess(true);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        'Lien invalide ou expiré. Veuillez refaire une demande.'
      );
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    backgroundColor: '#FFFFFF',
    border: '1px solid #CED4DA',
    color: '#2C3E50',
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
          {success ? (

            /* ═══════════════════════════════════
                SUCCÈS
            ═══════════════════════════════════ */
            <div
              className="text-center py-3 sm:py-4"
              aria-live="polite"
              aria-atomic="true"
            >
              <div
                className="text-5xl mb-4"
                aria-hidden="true"
              >
                ✅
              </div>

              <h2
                className="text-xl font-semibold mb-2"
                style={{ color: '#2C3E50' }}
              >
                Mot de passe mis à jour !
              </h2>

              <p
                className="
                  text-sm
                  leading-relaxed
                  mb-6
                "
                style={{ color: '#6C757D' }}
              >
                Votre mot de passe a été réinitialisé avec succès.
              </p>

              <button
                type="button"
                onClick={() => router.push('/login')}
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
                Se connecter →
              </button>
            </div>

          ) : (

            /* ═══════════════════════════════════
                FORMULAIRE
            ═══════════════════════════════════ */
            <>
              <h2
                className="text-xl font-semibold mb-2"
                style={{ color: '#2C3E50' }}
              >
                Nouveau mot de passe
              </h2>

              <p
                className="text-sm leading-relaxed mb-6"
                style={{ color: '#6C757D' }}
              >
                Choisissez un nouveau mot de passe pour votre compte CORO.
              </p>

              <form
                onSubmit={handleSubmit}
                className="space-y-5"
              >

                {/* NOUVEAU MOT DE PASSE */}
                <div>
                  <label
                    htmlFor="new-password"
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: '#495057' }}
                  >
                    Nouveau mot de passe
                  </label>

                  <input
                    id="new-password"
                    name="new-password"
                    type="password"
                    value={password}
                    onChange={e => {
                      setPassword(e.target.value);

                      if (error) {
                        setError('');
                      }
                    }}
                    placeholder="Minimum 8 caractères"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    disabled={loading}
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

                  <p
                    className="text-xs mt-1.5"
                    style={{ color: '#ADB5BD' }}
                  >
                    Minimum 8 caractères.
                  </p>
                </div>


                {/* CONFIRMATION */}
                <div>
                  <label
                    htmlFor="confirm-password"
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: '#495057' }}
                  >
                    Confirmer le mot de passe
                  </label>

                  <input
                    id="confirm-password"
                    name="confirm-password"
                    type="password"
                    value={confirm}
                    onChange={e => {
                      setConfirm(e.target.value);

                      if (error) {
                        setError('');
                      }
                    }}
                    placeholder="Répétez le mot de passe"
                    required
                    autoComplete="new-password"
                    disabled={loading}
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


                {/* ERREUR */}
                <div
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {error && (
                    <div
                      className="
                        rounded
                        px-4
                        py-3
                      "
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


                {/* BOUTON */}
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
                  {loading
                    ? 'Mise à jour...'
                    : 'Réinitialiser le mot de passe'}
                </button>

              </form>
            </>
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


export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main
          className="
            min-h-screen
            min-h-[100dvh]
            flex
            items-center
            justify-center
            px-4
          "
          style={{ backgroundColor: '#F8F9FA' }}
        >
          <p
            className="text-sm animate-pulse"
            style={{ color: '#ADB5BD' }}
          >
            Chargement...
          </p>
        </main>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}