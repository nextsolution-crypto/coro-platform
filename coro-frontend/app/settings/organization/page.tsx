'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { ArrowLeft, Save } from 'lucide-react';
import DragDropUpload from '@/components/ui/DragDropUpload';

export default function OrganizationSettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, initAuth, refreshUser } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFullPreview, setLogoFullPreview] = useState<string | null>(null);

  const [orgInfo, setOrgInfo] = useState<any>(null);

  const [form, setForm] = useState({
    companyName: '',
    companyPhone: '',
    companyEmail: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputFullRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      if (!['ADMIN', 'SUPER_ADMIN'].includes(user?.role || '')) {
        router.push('/settings');
        return;
      }

      fetchData();
    }
  }, [isAuthenticated, user, router]);

  const fetchData = async () => {
    try {
      const res = await api.get('/users/me');

      setForm({
        companyName: res.data.companyName || '',
        companyPhone: res.data.companyPhone || '',
        companyEmail: res.data.companyEmail || '',
      });

      if (res.data.companyLogoB64) {
        setLogoPreview(res.data.companyLogoB64);
      }

      if (res.data.companyLogoFullB64) {
        setLogoFullPreview(res.data.companyLogoFullB64);
      }

      const orgRes = await api
        .get('/organizations/me/info')
        .catch(() => ({ data: null }));

      setOrgInfo(orgRes.data);
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
      await refreshUser();
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
      }, 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Le logo doit faire moins de 2MB');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();

    reader.onload = async ev => {
      const base64 = ev.target?.result as string;
      setLogoPreview(base64);
      try {
        await api.put('/users/me/logo', {
          companyLogoB64: base64,
        });
        await refreshUser();
      } catch (err) {
        console.error(err);
      }
    };

    reader.readAsDataURL(file);
  };

  const handleLogoFullUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Le logo doit faire moins de 2MB');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();

        reader.onload = async ev => {
      const base64 = ev.target?.result as string;
      setLogoFullPreview(base64);
      try {
        await api.put('/users/me/logo', {
          companyLogoFullB64: base64,
        });
        await refreshUser();
      } catch (err) {
        console.error(err);
      }
    };

    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = async () => {
    setLogoPreview(null);

    try {
      await api.put('/users/me/logo', {
        companyLogoB64: null,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveFullLogo = async () => {
    setLogoFullPreview(null);

    try {
      await api.put('/users/me/logo-full', {
        companyLogoFullB64: null,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const inputStyle: React.CSSProperties = {
    border: '1px solid #CED4DA',
    color: '#2C3E50',
    backgroundColor: '#FFFFFF',
  };

  const focusInput = (
    e: React.FocusEvent<HTMLInputElement>
  ) => {
    e.currentTarget.style.borderColor = '#C0392B';
  };

  const blurInput = (
    e: React.FocusEvent<HTMLInputElement>
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
            Organisation
          </h2>

          <p
            className="text-sm mt-1 leading-relaxed"
            style={{ color: '#6C757D' }}
          >
            Informations et branding de votre organisation
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
          GRILLE PRINCIPALE
      ═══════════════════════════════════ */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

        {/* ═════════════════════════════════
            LOGOS
        ═════════════════════════════════ */}

        <div className="space-y-4 sm:space-y-6 min-w-0">

                    {/* LOGO ICÔNE */}
          <section className="rounded-lg p-4 sm:p-6"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
            <h3 className="font-semibold mb-1" style={{ color: '#2C3E50' }}>Logo icône</h3>
            <p className="text-xs leading-relaxed mb-4" style={{ color: '#ADB5BD' }}>
              Apparaît sur les documents générés
            </p>
            <DragDropUpload
              value={logoPreview || ''}
              onChange={async (base64) => {
                setLogoPreview(base64 || null);
                if (!base64) {
                  await api.put('/users/me/logo', { companyLogoB64: null });
                }
              }}
              mode="base64"
              onBase64={async (base64) => {
                setLogoPreview(base64);
                await api.put('/users/me/logo', { companyLogoB64: base64 });
              }}
              label="Téléverser le logo icône"
              hint="PNG ou SVG recommandé · Max 2 MB"
              maxSizeMB={2}
              aspectRatio="square"
              previewHeight={140}
            />
          </section>


                    {/* LOGO COMPLET */}
          <section className="rounded-lg p-4 sm:p-6"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
            <h3 className="font-semibold mb-1" style={{ color: '#2C3E50' }}>Logo complet</h3>
            <p className="text-xs leading-relaxed mb-4" style={{ color: '#ADB5BD' }}>
              Icône + nom — page de couverture des documents
            </p>
            <DragDropUpload
              value={logoFullPreview || ''}
              onChange={async (base64) => {
                setLogoFullPreview(base64 || null);
                if (!base64) {
                  await api.put('/users/me/logo-full', { companyLogoFullB64: null });
                }
              }}
              mode="base64"
              onBase64={async (base64) => {
                setLogoFullPreview(base64);
                await api.put('/users/me/logo-full', { companyLogoFullB64: base64 });
              }}
              label="Téléverser le logo complet"
              hint="PNG ou SVG recommandé · Max 2 MB"
              maxSizeMB={2}
              aspectRatio="wide"
              previewHeight={100}
            />
          </section>

        </div>


        {/* ═════════════════════════════════
            COLONNE INFORMATIONS
        ═════════════════════════════════ */}

        <div className="lg:col-span-2 space-y-4 sm:space-y-6 min-w-0">

          {/* INFORMATIONS ENTREPRISE */}

          <section
            className="rounded-lg p-4 sm:p-6"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E9ECEF',
            }}
          >
            <h3
              className="font-semibold mb-4"
              style={{ color: '#2C3E50' }}
            >
              Informations entreprise
            </h3>

            <div className="space-y-4">

              {/* NOM */}

              <div className="min-w-0">
                <label
                  htmlFor="companyName"
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: '#495057' }}
                >
                  Nom de l'entreprise
                </label>

                <input
                  id="companyName"
                  name="companyName"
                  type="text"
                  value={form.companyName}
                  onChange={e =>
                    setForm({
                      ...form,
                      companyName: e.target.value,
                    })
                  }
                  autoComplete="organization"
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


              {/* TÉLÉPHONE + COURRIEL */}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div className="min-w-0">
                  <label
                    htmlFor="companyPhone"
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: '#495057' }}
                  >
                    Téléphone
                  </label>

                  <input
                    id="companyPhone"
                    name="companyPhone"
                    type="tel"
                    value={form.companyPhone}
                    onChange={e =>
                      setForm({
                        ...form,
                        companyPhone: e.target.value,
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
                    htmlFor="companyEmail"
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: '#495057' }}
                  >
                    Courriel
                  </label>

                  <input
                    id="companyEmail"
                    name="companyEmail"
                    type="email"
                    value={form.companyEmail}
                    onChange={e =>
                      setForm({
                        ...form,
                        companyEmail: e.target.value,
                      })
                    }
                    placeholder="info@organisation.ca"
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

            </div>
          </section>


          {/* ═════════════════════════════════
              LICENCE CORO
          ═════════════════════════════════ */}

          {orgInfo && (
            <section
              className="rounded-lg p-4 sm:p-6"
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E9ECEF',
              }}
            >
              <h3
                className="font-semibold mb-4"
                style={{ color: '#2C3E50' }}
              >
                Licence CORO
              </h3>

              <div
                className="
                  grid
                  grid-cols-1
                  min-[400px]:grid-cols-2
                  sm:grid-cols-4
                  gap-4
                "
              >
                {[
                  {
                    label: 'Organisation',
                    value: orgInfo.name,
                  },
                  {
                    label: 'Licence',
                    value:
                      orgInfo.licenseType === 'ESSAI_GRATUIT'
                        ? 'Essai gratuit'
                        : orgInfo.licenseType === 'STANDARD'
                          ? 'Standard'
                          : 'Entreprise',
                  },
                  {
                    label: 'Membres',
                    value:
                      orgInfo.users?.length ??
                      orgInfo._count?.users ??
                      '—',
                  },
                  {
                    label: 'Projets',
                    value:
                      orgInfo._count?.projects ??
                      '—',
                  },
                ].map(item => (
                  <div
                    key={item.label}
                    className="min-w-0"
                  >
                    <p
                      className="text-xs"
                      style={{ color: '#ADB5BD' }}
                    >
                      {item.label}
                    </p>

                    <p
                      className="
                        text-sm
                        font-semibold
                        mt-1
                        break-words
                      "
                      style={{ color: '#2C3E50' }}
                    >
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}


          {/* ═════════════════════════════════
              PERSONNALISATION DOCUMENTAIRE
          ═════════════════════════════════ */}

          <section
            className="rounded-lg p-4 sm:p-6"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E9ECEF',
            }}
          >
            <h3
              className="font-semibold mb-4"
              style={{ color: '#2C3E50' }}
            >
              Personnalisation documentaire
            </h3>

            <button
              type="button"
              onClick={() =>
                router.push('/settings/module1-template')
              }
              className="
                flex
                items-center
                justify-between
                gap-3
                w-full
                min-h-[48px]
                px-4
                py-3
                rounded
                text-sm
                font-medium
                text-left
                transition-colors
              "
              style={{
                border: '1px solid #E9ECEF',
                color: '#2C3E50',
                backgroundColor: '#F8F9FA',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#C0392B';
                e.currentTarget.style.color = '#C0392B';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#E9ECEF';
                e.currentTarget.style.color = '#2C3E50';
              }}
            >
              <span className="min-w-0 break-words">
                📄 Modèle Module 1 — Introduction
              </span>

              <span
                className="flex-shrink-0"
                aria-hidden="true"
              >
                →
              </span>
            </button>

          </section>

        </div>

      </div>

    </AppLayout>
  );
}