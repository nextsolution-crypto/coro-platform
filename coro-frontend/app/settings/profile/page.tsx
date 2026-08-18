'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { ArrowLeft, Save } from 'lucide-react';

export default function ProfileSettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, initAuth } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    newPass: '',
    confirm: '',
  });

  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    title: '',
    phoneDirect: '',
    phoneMobile: '',
    certification: '',
    province: 'Quebec',
  });

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      const res = await api.get('/users/me');

      setForm({
        firstName: res.data.firstName || '',
        lastName: res.data.lastName || '',
        email: res.data.email || '',
        title: res.data.title || '',
        phoneDirect: res.data.phoneDirect || '',
        phoneMobile: res.data.phoneMobile || '',
        certification: res.data.certification || '',
        province: res.data.province || 'Quebec',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (saving) return;

    setSaving(true);

    try {
      await api.put('/users/me', form);

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (changingPassword) return;

    setPasswordError('');
    setPasswordSuccess(false);

    if (passwordForm.newPass !== passwordForm.confirm) {
      setPasswordError('Les mots de passe ne correspondent pas.');
      return;
    }

    if (passwordForm.newPass.length < 8) {
      setPasswordError(
        'Le mot de passe doit contenir au moins 8 caractères.'
      );
      return;
    }

    setChangingPassword(true);

    try {
      await api.put('/users/me/password', {
        currentPassword: passwordForm.current,
        newPassword: passwordForm.newPass,
      });

      setPasswordSuccess(true);

      setPasswordForm({
        current: '',
        newPass: '',
        confirm: '',
      });

      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      setPasswordError(
        err.response?.data?.message ||
          'Mot de passe actuel incorrect.'
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    border: '1px solid #CED4DA',
    color: '#2C3E50',
    backgroundColor: '#FFFFFF',
  };

  const focusInput = (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    e.currentTarget.style.borderColor = '#C0392B';
  };

  const blurInput = (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    e.currentTarget.style.borderColor = '#CED4DA';
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20 sm:py-24">
          <p
            className="text-sm animate-pulse"
            style={{ color: '#ADB5BD' }}
          >
            Chargement...
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>

      {/* ═══════════════════════════════════
          EN-TÊTE
      ═══════════════════════════════════ */}

      <div
        className="
          flex
          flex-col
          sm:flex-row
          sm:items-end
          sm:justify-between
          gap-4
          mb-6
          sm:mb-8
        "
      >
        <div className="min-w-0">

          <button
            type="button"
            onClick={() => router.push('/settings')}
            className="
              inline-flex
              items-center
              gap-2
              text-sm
              mb-3
              min-h-[36px]
              transition-colors
            "
            style={{
              color: '#6C757D',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = '#2C3E50';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = '#6C757D';
            }}
          >
            <ArrowLeft size={16} />
            Retour aux paramètres
          </button>

          <h2
            className="text-xl sm:text-2xl font-semibold"
            style={{ color: '#2C3E50' }}
          >
            Mon profil
          </h2>

          <p
            className="text-sm mt-1 leading-relaxed"
            style={{ color: '#6C757D' }}
          >
            Vos informations personnelles et professionnelles
          </p>

        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="
            w-full
            sm:w-auto
            min-h-[46px]
            flex
            items-center
            justify-center
            gap-2
            text-white
            text-sm
            font-medium
            px-5
            py-2.5
            rounded
            transition-colors
            flex-shrink-0
            disabled:cursor-not-allowed
          "
          style={{
            backgroundColor: saved
              ? '#27AE60'
              : saving
                ? '#E8A89C'
                : '#C0392B',
          }}
          onMouseEnter={e => {
            if (!saved && !saving) {
              e.currentTarget.style.backgroundColor = '#A93226';
            }
          }}
          onMouseLeave={e => {
            if (!saved && !saving) {
              e.currentTarget.style.backgroundColor = '#C0392B';
            }
          }}
        >
          <Save size={16} />

          {saving
            ? 'Sauvegarde...'
            : saved
              ? '✓ Sauvegardé !'
              : 'Sauvegarder'}
        </button>

      </div>


      {/* ═══════════════════════════════════
          CONTENU
      ═══════════════════════════════════ */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

        {/* ─────────────────────────────────
            IDENTITÉ
        ───────────────────────────────── */}

        <section
          className="rounded-lg p-4 sm:p-6 min-w-0"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E9ECEF',
          }}
        >
          <h3
            className="font-semibold mb-4"
            style={{ color: '#2C3E50' }}
          >
            Identité
          </h3>

          <div className="space-y-4">

            {/* PRÉNOM + NOM */}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <div className="min-w-0">
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: '#495057' }}
                >
                  Prénom
                </label>

                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={form.firstName}
                  onChange={e =>
                    setForm({
                      ...form,
                      firstName: e.target.value,
                    })
                  }
                  autoComplete="given-name"
                  className="
                    w-full
                    min-w-0
                    rounded
                    px-4
                    py-2.5
                    text-base
                    sm:text-sm
                    focus:outline-none
                    transition-colors
                  "
                  style={inputStyle}
                  onFocus={focusInput}
                  onBlur={blurInput}
                />
              </div>

              <div className="min-w-0">
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: '#495057' }}
                >
                  Nom
                </label>

                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={form.lastName}
                  onChange={e =>
                    setForm({
                      ...form,
                      lastName: e.target.value,
                    })
                  }
                  autoComplete="family-name"
                  className="
                    w-full
                    min-w-0
                    rounded
                    px-4
                    py-2.5
                    text-base
                    sm:text-sm
                    focus:outline-none
                    transition-colors
                  "
                  style={inputStyle}
                  onFocus={focusInput}
                  onBlur={blurInput}
                />
              </div>

            </div>


            {/* COURRIEL */}

            <div className="min-w-0">
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-1.5"
                style={{ color: '#495057' }}
              >
                Courriel
              </label>

              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={e =>
                  setForm({
                    ...form,
                    email: e.target.value,
                  })
                }
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                spellCheck={false}
                className="
                  w-full
                  min-w-0
                  rounded
                  px-4
                  py-2.5
                  text-base
                  sm:text-sm
                  focus:outline-none
                  transition-colors
                "
                style={inputStyle}
                onFocus={focusInput}
                onBlur={blurInput}
              />
            </div>

          </div>
        </section>


        {/* ─────────────────────────────────
            INFORMATIONS PROFESSIONNELLES
        ───────────────────────────────── */}

        <section
          className="rounded-lg p-4 sm:p-6 min-w-0"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E9ECEF',
          }}
        >
          <h3
            className="font-semibold mb-4"
            style={{ color: '#2C3E50' }}
          >
            Informations professionnelles
          </h3>

          <div className="space-y-4">

            {/* TITRE */}

            <div className="min-w-0">
              <label
                htmlFor="title"
                className="block text-sm font-medium mb-1.5"
                style={{ color: '#495057' }}
              >
                Titre / Fonction
              </label>

              <input
                id="title"
                name="title"
                type="text"
                value={form.title}
                onChange={e =>
                  setForm({
                    ...form,
                    title: e.target.value,
                  })
                }
                placeholder="Ex: Conseiller en sécurité incendie"
                autoComplete="organization-title"
                className="
                  w-full
                  min-w-0
                  rounded
                  px-4
                  py-2.5
                  text-base
                  sm:text-sm
                  focus:outline-none
                  transition-colors
                "
                style={inputStyle}
                onFocus={focusInput}
                onBlur={blurInput}
              />
            </div>


            {/* TÉLÉPHONES */}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <div className="min-w-0">
                <label
                  htmlFor="phoneDirect"
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: '#495057' }}
                >
                  Téléphone direct
                </label>

                <input
                  id="phoneDirect"
                  name="phoneDirect"
                  type="tel"
                  value={form.phoneDirect}
                  onChange={e =>
                    setForm({
                      ...form,
                      phoneDirect: e.target.value,
                    })
                  }
                  placeholder="514-555-1234"
                  autoComplete="tel"
                  inputMode="tel"
                  className="
                    w-full
                    min-w-0
                    rounded
                    px-4
                    py-2.5
                    text-base
                    sm:text-sm
                    focus:outline-none
                    transition-colors
                  "
                  style={inputStyle}
                  onFocus={focusInput}
                  onBlur={blurInput}
                />
              </div>

              <div className="min-w-0">
                <label
                  htmlFor="phoneMobile"
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: '#495057' }}
                >
                  Cellulaire
                </label>

                <input
                  id="phoneMobile"
                  name="phoneMobile"
                  type="tel"
                  value={form.phoneMobile}
                  onChange={e =>
                    setForm({
                      ...form,
                      phoneMobile: e.target.value,
                    })
                  }
                  placeholder="514-555-5678"
                  autoComplete="tel"
                  inputMode="tel"
                  className="
                    w-full
                    min-w-0
                    rounded
                    px-4
                    py-2.5
                    text-base
                    sm:text-sm
                    focus:outline-none
                    transition-colors
                  "
                  style={inputStyle}
                  onFocus={focusInput}
                  onBlur={blurInput}
                />
              </div>

            </div>


            {/* CERTIFICATION */}

            <div className="min-w-0">
              <label
                htmlFor="certification"
                className="block text-sm font-medium mb-1.5"
                style={{ color: '#495057' }}
              >
                Numéro de certification
              </label>

              <input
                id="certification"
                name="certification"
                type="text"
                value={form.certification}
                onChange={e =>
                  setForm({
                    ...form,
                    certification: e.target.value,
                  })
                }
                placeholder="Ex: CFAA-12345"
                className="
                  w-full
                  min-w-0
                  rounded
                  px-4
                  py-2.5
                  text-base
                  sm:text-sm
                  focus:outline-none
                  transition-colors
                "
                style={inputStyle}
                onFocus={focusInput}
                onBlur={blurInput}
              />
            </div>


            {/* PROVINCE */}

            <div className="min-w-0">
              <label
                htmlFor="province"
                className="block text-sm font-medium mb-1.5"
                style={{ color: '#495057' }}
              >
                Province principale
              </label>

              <select
                id="province"
                name="province"
                value={form.province}
                onChange={e =>
                  setForm({
                    ...form,
                    province: e.target.value,
                  })
                }
                className="
                  w-full
                  min-w-0
                  rounded
                  px-4
                  py-2.5
                  text-base
                  sm:text-sm
                  focus:outline-none
                  transition-colors
                "
                style={inputStyle}
                onFocus={focusInput}
                onBlur={blurInput}
              >
                <option value="Quebec">Québec</option>
                <option value="Ontario">Ontario</option>
                <option value="Alberta">Alberta</option>
              </select>
            </div>

          </div>
        </section>


        {/* ─────────────────────────────────
            MOT DE PASSE
        ───────────────────────────────── */}

        <section
          className="
            rounded-lg
            p-4
            sm:p-6
            min-w-0
            lg:col-span-2
          "
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E9ECEF',
          }}
        >
          <h3
            className="font-semibold mb-4"
            style={{ color: '#2C3E50' }}
          >
            Changer le mot de passe
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* ACTUEL */}

            <div className="min-w-0">
              <label
                htmlFor="current-password"
                className="block text-sm font-medium mb-1.5"
                style={{ color: '#495057' }}
              >
                Mot de passe actuel
              </label>

              <input
                id="current-password"
                name="current-password"
                type="password"
                value={passwordForm.current}
                onChange={e => {
                  setPasswordForm({
                    ...passwordForm,
                    current: e.target.value,
                  });

                  if (passwordError) {
                    setPasswordError('');
                  }
                }}
                autoComplete="current-password"
                disabled={changingPassword}
                className="
                  w-full
                  min-w-0
                  rounded
                  px-4
                  py-2.5
                  text-base
                  sm:text-sm
                  focus:outline-none
                  transition-colors
                  disabled:opacity-60
                "
                style={inputStyle}
                onFocus={focusInput}
                onBlur={blurInput}
              />
            </div>


            {/* NOUVEAU */}

            <div className="min-w-0">
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
                value={passwordForm.newPass}
                onChange={e => {
                  setPasswordForm({
                    ...passwordForm,
                    newPass: e.target.value,
                  });

                  if (passwordError) {
                    setPasswordError('');
                  }
                }}
                minLength={8}
                autoComplete="new-password"
                disabled={changingPassword}
                className="
                  w-full
                  min-w-0
                  rounded
                  px-4
                  py-2.5
                  text-base
                  sm:text-sm
                  focus:outline-none
                  transition-colors
                  disabled:opacity-60
                "
                style={inputStyle}
                onFocus={focusInput}
                onBlur={blurInput}
              />

              <p
                className="text-xs mt-1.5"
                style={{ color: '#ADB5BD' }}
              >
                Minimum 8 caractères.
              </p>
            </div>


            {/* CONFIRMATION */}

            <div className="min-w-0">
              <label
                htmlFor="confirm-password"
                className="block text-sm font-medium mb-1.5"
                style={{ color: '#495057' }}
              >
                Confirmer
              </label>

              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                value={passwordForm.confirm}
                onChange={e => {
                  setPasswordForm({
                    ...passwordForm,
                    confirm: e.target.value,
                  });

                  if (passwordError) {
                    setPasswordError('');
                  }
                }}
                minLength={8}
                autoComplete="new-password"
                disabled={changingPassword}
                className="
                  w-full
                  min-w-0
                  rounded
                  px-4
                  py-2.5
                  text-base
                  sm:text-sm
                  focus:outline-none
                  transition-colors
                  disabled:opacity-60
                "
                style={inputStyle}
                onFocus={focusInput}
                onBlur={blurInput}
              />
            </div>

          </div>


          {/* MESSAGES */}

          <div
            aria-live="polite"
            aria-atomic="true"
          >
            {passwordError && (
              <div
                className="rounded px-4 py-3 mt-4"
                style={{
                  backgroundColor: '#FDEDEC',
                  border: '1px solid #F1948A',
                }}
              >
                <p
                  className="text-sm break-words"
                  style={{ color: '#C0392B' }}
                >
                  {passwordError}
                </p>
              </div>
            )}

            {passwordSuccess && (
              <div
                className="rounded px-4 py-3 mt-4"
                style={{
                  backgroundColor: '#EAFAF1',
                  border: '1px solid #A9DFBF',
                }}
              >
                <p
                  className="text-sm"
                  style={{ color: '#27AE60' }}
                >
                  ✓ Mot de passe mis à jour !
                </p>
              </div>
            )}
          </div>


          {/* BOUTON MOT DE PASSE */}

          <button
            type="button"
            onClick={handleChangePassword}
            disabled={
              changingPassword ||
              !passwordForm.current ||
              !passwordForm.newPass ||
              !passwordForm.confirm
            }
            className="
              mt-4
              w-full
              sm:w-auto
              min-h-[44px]
              text-sm
              font-medium
              px-5
              py-2.5
              rounded
              transition-colors
              disabled:opacity-50
              disabled:cursor-not-allowed
            "
            style={{
              backgroundColor: '#2C3E50',
              color: '#FFFFFF',
            }}
            onMouseEnter={e => {
              if (!changingPassword) {
                e.currentTarget.style.backgroundColor = '#1A252F';
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = '#2C3E50';
            }}
          >
            {changingPassword
              ? 'Mise à jour...'
              : 'Changer le mot de passe'}
          </button>

        </section>

      </div>

    </AppLayout>
  );
}