'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3002/api';

function MagicLinkHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get('token');

  const [error, setError] = useState('');
  const [validating, setValidating] = useState(true);

  const validateToken = useCallback(async () => {
    if (!token) {
      router.push('/login');
      return;
    }

    setValidating(true);
    setError('');

    try {
      const res = await fetch(
        `${API_URL}/client-auth/magic-link/validate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token,
          }),
        }
      );

      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          payload?.message ||
          'Lien invalide ou expiré.'
        );
      }

      const {
        token: jwtToken,
        user,
      } = payload;

      localStorage.setItem(
        'coro_client_token',
        jwtToken
      );

      localStorage.setItem(
        'coro_client_user',
        JSON.stringify(user)
      );

      router.push('/dashboard');
    } catch (err: any) {
      setError(
        err?.message ||
        'Lien invalide ou expiré.'
      );
    } finally {
      setValidating(false);
    }
  }, [token, router]);

  useEffect(() => {
    validateToken();
  }, [validateToken]);


  /* ═══════════════════════════════════
     ERREUR
  ═══════════════════════════════════ */

  if (error) {
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
        style={{
          backgroundColor: '#F8F9FA',
        }}
      >
        <div className="w-full max-w-md">

          <section
            className="
              bg-white
              rounded-lg
              p-5
              sm:p-8
              text-center
            "
            style={{
              border: '1px solid #E9ECEF',
              boxShadow:
                '0 2px 16px rgba(0,0,0,0.08)',
            }}
            aria-live="polite"
            aria-atomic="true"
          >
            <div
              className="text-5xl mb-4"
              aria-hidden="true"
            >
              ⚠️
            </div>

            <h2
              className="
                text-xl
                font-semibold
                mb-2
              "
              style={{
                color: '#2C3E50',
              }}
            >
              Lien invalide ou expiré
            </h2>

            <p
              className="
                text-sm
                leading-relaxed
                mb-6
                break-words
              "
              style={{
                color: '#6C757D',
              }}
            >
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                router.push('/login')
              }
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
                e.currentTarget.style.backgroundColor =
                  '#A93226';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor =
                  '#C0392B';
              }}
            >
              Se connecter normalement
            </button>

          </section>

        </div>
      </main>
    );
  }


  /* ═══════════════════════════════════
     VALIDATION DU LIEN
  ═══════════════════════════════════ */

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
      "
      style={{
        backgroundColor: '#F8F9FA',
      }}
    >
      <div
        className="
          text-center
          w-full
          max-w-sm
        "
        aria-live="polite"
        aria-atomic="true"
      >
        <div
          className="
            text-4xl
            sm:text-5xl
            mb-4
            animate-pulse
          "
          aria-hidden="true"
        >
          🔐
        </div>

        <p
          className="
            text-sm
            sm:text-base
          "
          style={{
            color: '#6C757D',
          }}
        >
          {validating
            ? 'Connexion en cours...'
            : 'Redirection...'}
        </p>

      </div>
    </main>
  );
}


export default function MagicPage() {
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
          style={{
            backgroundColor: '#F8F9FA',
          }}
        >
          <p
            className="
              text-sm
              animate-pulse
            "
            style={{
              color: '#ADB5BD',
            }}
          >
            Chargement...
          </p>
        </main>
      }
    >
      <MagicLinkHandler />
    </Suspense>
  );
}