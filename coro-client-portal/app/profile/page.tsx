'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, clearAuth } from '../store/auth';
import { toast } from '../store/toast';
import PortalLayout from '../components/PortalLayout';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

export default function ProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);

  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const currentUser = getUser();

    if (!currentUser) {
      router.replace('/login');
      return;
    }

    setUser(currentUser);
  }, [router]);

  const handleChangePassword = async () => {
    setError('');
    setSaved(false);

    if (passwordForm.newPassword.length < 8) {
      setError(
        'Le mot de passe doit contenir au moins 8 caractères.'
      );
      return;
    }

    if (
      passwordForm.newPassword !==
      passwordForm.confirmPassword
    ) {
      setError(
        'Les mots de passe ne correspondent pas.'
      );
      return;
    }

    setSaving(true);

    try {
      const token = localStorage.getItem(
        'coro_client_token'
      );

      const res = await fetch(
        `${API_URL}/client-auth/change-password`,
        {
          method: 'PUT',

          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            newPassword:
              passwordForm.newPassword,
          }),
        }
      );

      if (!res.ok) {
        throw new Error(
          'Erreur lors du changement de mot de passe'
        );
      }

            setSaved(true);
      setPasswordForm({
        newPassword: '',
        confirmPassword: '',
      });
      toast('Mot de passe modifié avec succès.');
      window.setTimeout(() => {
        setSaved(false);
      }, 3000);
    } catch {
      setError('Erreur lors du changement de mot de passe.');
      toast('Erreur lors du changement de mot de passe.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!saving) {
      handleChangePassword();
    }
  };

  const handleLogout = () => {
    clearAuth();
    router.replace('/login');
  };

  if (!user) {
    return (
      <PortalLayout>
        <div
          style={{
            minHeight: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <p
            className="animate-pulse"
            style={{
              margin: 0,
              color: '#ADB5BD',
              fontSize: 14,
            }}
          >
            Chargement...
          </p>
        </div>
      </PortalLayout>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    minHeight: 48,
    padding: '12px 14px',
    borderRadius: 7,
    border: '1px solid #DEE2E6',
    fontSize: 16,
    color: '#2C3E50',
    backgroundColor: '#FFFFFF',
    outline: 'none',
    transition:
      'border-color 0.2s, box-shadow 0.2s',
  };

  return (
    <PortalLayout>
      <div
        style={{
          width: '100%',
          maxWidth: 600,
          margin: '0 auto',
        }}
      >
        {/* En-tête */}
        <header
          style={{
            marginBottom: 28,
          }}
        >
          <p
            style={{
              margin: '0 0 4px',
              fontSize: 12,
              fontWeight: 700,
              color: '#ADB5BD',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Compte
          </p>

          <h1
            style={{
              margin: 0,
              fontSize:
                'clamp(24px, 5vw, 28px)',
              lineHeight: 1.2,
              fontWeight: 800,
              color: '#2C3E50',
            }}
          >
            Mon profil
          </h1>
        </header>

        {/* Informations */}
        <section
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            border: '1px solid #E9ECEF',
            padding:
              'clamp(20px, 5vw, 32px)',
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              marginBottom: 24,
              minWidth: 0,
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                backgroundColor: '#C0392B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontSize: 20,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {user.firstName?.[0]}
              {user.lastName?.[0]}
            </div>

            {/* Identité */}
            <div
              style={{
                minWidth: 0,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 18,
                  lineHeight: 1.3,
                  fontWeight: 700,
                  color: '#2C3E50',
                  overflowWrap: 'anywhere',
                }}
              >
                {user.firstName}{' '}
                {user.lastName}
              </p>

              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: 14,
                  lineHeight: 1.4,
                  color: '#6C757D',
                  overflowWrap: 'anywhere',
                }}
              >
                {user.email}
              </p>

              <span
                style={{
                  display: 'inline-block',
                  marginTop: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 4,
                  backgroundColor: '#EBF5FB',
                  color: '#2980B9',
                }}
              >
                {user.role ===
                'CLIENT_CORPORATE'
                  ? 'Équipe corporative'
                  : 'Gestionnaire'}
              </span>
            </div>
          </div>

          {/* Organisation */}
          <div
            style={{
              padding: '16px',
              backgroundColor: '#F8F9FA',
              borderRadius: 8,
            }}
          >
            <p
              style={{
                margin: '0 0 4px',
                fontSize: 12,
                color: '#ADB5BD',
              }}
            >
              Organisation cliente
            </p>

            <p
              style={{
                margin: 0,
                fontSize: 15,
                lineHeight: 1.4,
                fontWeight: 600,
                color: '#2C3E50',
                overflowWrap: 'anywhere',
              }}
            >
              {user.clientName}
            </p>
          </div>
        </section>

        {/* Mot de passe */}
        <section
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            border: '1px solid #E9ECEF',
            padding:
              'clamp(20px, 5vw, 32px)',
            marginBottom: 24,
          }}
        >
          <h2
            style={{
              margin: '0 0 20px',
              fontSize: 18,
              fontWeight: 700,
              color: '#2C3E50',
            }}
          >
            Changer le mot de passe
          </h2>

          <form onSubmit={handleSubmit}>
            {/* Nouveau mot de passe */}
            <div
              style={{
                marginBottom: 16,
              }}
            >
              <label
                htmlFor="new-password"
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#495057',
                  marginBottom: 6,
                }}
              >
                Nouveau mot de passe
              </label>

              <input
                id="new-password"
                name="new-password"
                type="password"
                autoComplete="new-password"
                value={
                  passwordForm.newPassword
                }
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    newPassword:
                      e.target.value,
                  })
                }
                placeholder="Minimum 8 caractères"
                required
                minLength={8}
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor =
                    '#C0392B';

                  e.currentTarget.style.boxShadow =
                    '0 0 0 3px rgba(192,57,43,0.10)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor =
                    '#DEE2E6';

                  e.currentTarget.style.boxShadow =
                    'none';
                }}
              />
            </div>

            {/* Confirmation */}
            <div
              style={{
                marginBottom: 20,
              }}
            >
              <label
                htmlFor="confirm-password"
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#495057',
                  marginBottom: 6,
                }}
              >
                Confirmer le mot de passe
              </label>

              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                value={
                  passwordForm.confirmPassword
                }
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    confirmPassword:
                      e.target.value,
                  })
                }
                placeholder="Répéter le nouveau mot de passe"
                required
                minLength={8}
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor =
                    '#C0392B';

                  e.currentTarget.style.boxShadow =
                    '0 0 0 3px rgba(192,57,43,0.10)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor =
                    '#DEE2E6';

                  e.currentTarget.style.boxShadow =
                    'none';
                }}
              />
            </div>

            {/* Erreur */}
            {error && (
              <div
                role="alert"
                style={{
                  backgroundColor: '#FDEDEC',
                  border:
                    '1px solid #F1948A',
                  borderRadius: 7,
                  padding: '11px 14px',
                  marginBottom: 16,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: '#C0392B',
                  }}
                >
                  {error}
                </p>
              </div>
            )}

            {/* Bouton */}
            <button
              type="submit"
              disabled={
                saving ||
                !passwordForm.newPassword
              }
              style={{
                width: '100%',
                minHeight: 48,
                padding: '12px 18px',
                borderRadius: 7,

                backgroundColor: saved
                  ? '#27AE60'
                  : saving ||
                      !passwordForm.newPassword
                    ? '#ADB5BD'
                    : '#C0392B',

                color: '#FFFFFF',
                border: 'none',
                fontSize: 14,
                fontWeight: 700,

                cursor:
                  saving ||
                  !passwordForm.newPassword
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >
              {saving
                ? 'Sauvegarde...'
                : saved
                  ? '✓ Mot de passe modifié'
                  : 'Changer le mot de passe'}
            </button>
          </form>
        </section>

        {/* Déconnexion */}
        <button
          type="button"
          onClick={handleLogout}
          style={{
            width: '100%',
            minHeight: 48,
            padding: '13px 16px',
            borderRadius: 8,
            border: '1px solid #F1948A',
            backgroundColor: 'transparent',
            color: '#C0392B',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            transition:
              'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor =
              '#FDEDEC';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor =
              'transparent';
          }}
        >
          Déconnexion
        </button>
      </div>
    </PortalLayout>
  );
}