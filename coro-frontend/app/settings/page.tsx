'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { formatPhone } from '@/lib/formatPhone';

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, initAuth } = useAuthStore();
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFullPreview, setLogoFullPreview] = useState<string | null>(null);
  const [orgInfo, setOrgInfo] = useState<{ name: string; licenseType: string; _count: any; users?: any[] } | null>(null);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', companyName: '',
    companyPhone: '', companyEmail: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputFullRef = useRef<HTMLInputElement>(null);

  useEffect(() => { initAuth(); }, []);

  useEffect(() => {
    if (isAuthenticated) fetchUser();
    else {
      const token = localStorage.getItem('coro_token');
      if (!token) router.push('/login');
    }
  }, [isAuthenticated]);

  // Recharger les infos org à chaque fois que la page devient visible
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isAuthenticated) {
        fetchUser();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isAuthenticated]);

  const fetchUser = async () => {
    try {
      const res = await api.get('/users/me');
      setForm({
        firstName:    res.data.firstName    || '',
        lastName:     res.data.lastName     || '',
        email:        res.data.email        || '',
        companyName:  res.data.companyName  || '',
        companyPhone: res.data.companyPhone || '',
        companyEmail: res.data.companyEmail || '',
      });
      if (res.data.companyLogoB64) setLogoPreview(res.data.companyLogoB64);
      if (res.data.companyLogoFullB64) setLogoFullPreview(res.data.companyLogoFullB64);

      if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
        try {
          const orgRes = await api.get('/organizations/me/info');
          setOrgInfo(orgRes.data);
        } catch (err) { console.error(err); }
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/users/me', form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Le logo doit faire moins de 2MB'); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      setLogoPreview(base64);
      try { await api.put('/users/me/logo', { companyLogoB64: base64 }); }
      catch (err) { console.error(err); }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = async () => {
    setLogoPreview(null);
    try { await api.put('/users/me/logo', { companyLogoB64: null }); }
    catch (err) { console.error(err); }
  };

  const handleLogoFullUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Le logo doit faire moins de 2MB'); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      setLogoFullPreview(base64);
      try { await api.put('/users/me/logo-full', { companyLogoFullB64: base64 }); }
      catch (err) { console.error(err); }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogoFull = async () => {
    setLogoFullPreview(null);
    try { await api.put('/users/me/logo-full', { companyLogoFullB64: null }); }
    catch (err) { console.error(err); }
  };

  const inputStyle = {
    border: '1px solid #CED4DA',
    color: '#2C3E50',
    backgroundColor: '#FFFFFF',
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#F8F9FA' }}>
      <p className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>
        Chargement...
      </p>
    </div>
  );

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-semibold" style={{ color: '#2C3E50' }}>
            Paramètres
          </h2>
          <p className="text-sm mt-1" style={{ color: '#6C757D' }}>
            Profil et configuration de votre entreprise
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-white font-medium px-6 py-2.5 rounded transition-colors
            disabled:opacity-50"
          style={{ backgroundColor: saved ? '#27AE60' : '#C0392B' }}
          onMouseEnter={e => {
            if (!saving) e.currentTarget.style.backgroundColor = saved ? '#1E8449' : '#A93226';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = saved ? '#27AE60' : '#C0392B';
          }}
        >
          {saving ? 'Sauvegarde...' : saved ? '✓ Sauvegardé !' : 'Sauvegarder'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">

        {/* Logo */}
        <div className="col-span-1">
          <div className="rounded-md p-6"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E9ECEF',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}>
            <h3 className="font-semibold mb-1" style={{ color: '#2C3E50' }}>
              Logo entreprise
            </h3>
            <p className="text-xs mb-4" style={{ color: '#ADB5BD' }}>
              Apparaîtra sur tous les documents générés
            </p>

            <div className="flex flex-col items-center gap-4">
              {logoPreview ? (
                <div className="relative">
                  <div className="w-32 h-32 rounded-md overflow-hidden flex items-center
                    justify-center bg-white"
                    style={{ border: '1px solid #E9ECEF' }}>
                    <img src={logoPreview} alt="Logo"
                      className="w-full h-full object-contain p-2" />
                  </div>
                  <button
                    onClick={handleRemoveLogo}
                    className="absolute -top-2 -right-2 text-white rounded-full w-6 h-6
                      flex items-center justify-center text-xs"
                    style={{ backgroundColor: '#C0392B' }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-32 h-32 rounded-md flex flex-col items-center
                    justify-center cursor-pointer transition-colors"
                  style={{
                    border: '2px dashed #CED4DA',
                    backgroundColor: '#F8F9FA',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#C0392B'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#CED4DA'}
                >
                  <span className="text-3xl mb-2">🏭</span>
                  <span className="text-xs text-center" style={{ color: '#ADB5BD' }}>
                    Cliquer pour ajouter
                  </span>
                </div>
              )}

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full text-sm py-2 rounded transition-colors font-medium"
                style={{
                  border: '1px solid #DEE2E6',
                  color: '#6C757D',
                  backgroundColor: '#F8F9FA',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#E9ECEF'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
              >
                {logoPreview ? 'Changer le logo' : 'Ajouter un logo'}
              </button>

              <p className="text-xs text-center" style={{ color: '#CED4DA' }}>
                PNG, JPG, SVG — Max 2MB
              </p>

              <input ref={fileInputRef} type="file" accept="image/*"
                onChange={handleLogoUpload} className="hidden" />
            </div>
          </div>

          {/* Logo complet (icône + nom) */}
          <div className="rounded-md p-6 mt-6"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E9ECEF',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}>
            <h3 className="font-semibold mb-1" style={{ color: '#2C3E50' }}>
              Logo complet
            </h3>
            <p className="text-xs mb-4" style={{ color: '#ADB5BD' }}>
              Icône + nom — utilisé sur la page de couverture des documents
            </p>

            <div className="flex flex-col items-center gap-4">
              {logoFullPreview ? (
                <div className="relative w-full">
                  <div className="w-full h-20 rounded-md overflow-hidden flex items-center
                    justify-center bg-white"
                    style={{ border: '1px solid #E9ECEF' }}>
                    <img src={logoFullPreview} alt="Logo complet"
                      className="max-w-full max-h-full object-contain p-2" />
                  </div>
                  <button
                    onClick={handleRemoveLogoFull}
                    className="absolute -top-2 -right-2 text-white rounded-full w-6 h-6
                      flex items-center justify-center text-xs"
                    style={{ backgroundColor: '#C0392B' }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputFullRef.current?.click()}
                  className="w-full h-20 rounded-md flex flex-col items-center
                    justify-center cursor-pointer transition-colors"
                  style={{
                    border: '2px dashed #CED4DA',
                    backgroundColor: '#F8F9FA',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#C0392B'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#CED4DA'}
                >
                  <span className="text-xs text-center" style={{ color: '#ADB5BD' }}>
                    Cliquer pour ajouter
                  </span>
                </div>
              )}

              <button
                onClick={() => fileInputFullRef.current?.click()}
                className="w-full text-sm py-2 rounded transition-colors font-medium"
                style={{
                  border: '1px solid #DEE2E6',
                  color: '#6C757D',
                  backgroundColor: '#F8F9FA',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#E9ECEF'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
              >
                {logoFullPreview ? 'Changer le logo complet' : 'Ajouter le logo complet'}
              </button>

              <p className="text-xs text-center" style={{ color: '#CED4DA' }}>
                PNG, JPG, SVG — Max 2MB
              </p>

              <input ref={fileInputFullRef} type="file" accept="image/*"
                onChange={handleLogoFullUpload} className="hidden" />
            </div>
          </div>
        </div>

        {/* Infos */}
        <div className="col-span-2 space-y-6">

          {/* Entreprise */}
          <div className="rounded-md p-6"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E9ECEF',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}>
            <h3 className="font-semibold mb-4" style={{ color: '#2C3E50' }}>
              Informations entreprise
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1.5"
                style={{ color: '#495057' }}>
                Nom de l'entreprise
              </label>
              <input
                type="text"
                value={form.companyName}
                onChange={e => setForm({ ...form, companyName: e.target.value })}
                placeholder="Ex: GardaWorld, Sécurité Plus..."
                className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#C0392B'}
                onBlur={e => e.target.style.borderColor = '#CED4DA'}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5"
                  style={{ color: '#495057' }}>
                  Téléphone de l'entreprise
                </label>
                <input
                  type="text"
                  value={form.companyPhone}
                  onChange={e => setForm({ ...form, companyPhone: e.target.value })}
                  placeholder="Ex: 514-555-1234"
                  className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => {
                    e.target.style.borderColor = '#CED4DA';
                    setForm({ ...form, companyPhone: formatPhone(e.target.value) });
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5"
                  style={{ color: '#495057' }}>
                  Courriel de l'entreprise
                </label>
                <input
                  type="email"
                  value={form.companyEmail}
                  onChange={e => setForm({ ...form, companyEmail: e.target.value })}
                  placeholder="Ex: info@coro.ca"
                  className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'}
                />
              </div>
            </div>
          </div>

          {/* Profil */}
          <div className="rounded-md p-6"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E9ECEF',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}>
            <h3 className="font-semibold mb-4" style={{ color: '#2C3E50' }}>
              Profil utilisateur
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1.5"
                  style={{ color: '#495057' }}>Prénom</label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={e => setForm({ ...form, firstName: e.target.value })}
                  className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5"
                  style={{ color: '#495057' }}>Nom</label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={e => setForm({ ...form, lastName: e.target.value })}
                  className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5"
                style={{ color: '#495057' }}>Courriel</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#C0392B'}
                onBlur={e => e.target.style.borderColor = '#CED4DA'}
              />
            </div>
          </div>

          {/* Organisation — visible seulement pour ADMIN/SUPER_ADMIN */}
          {orgInfo && (
            <div className="rounded-md p-6"
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E9ECEF',
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
              }}>
              <h3 className="font-semibold mb-1" style={{ color: '#2C3E50' }}>
                Mon organisation
              </h3>
              <p className="text-xs mb-4" style={{ color: '#ADB5BD' }}>
                Informations sur votre licence CORO
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs" style={{ color: '#ADB5BD' }}>Nom</p>
                  <p className="text-sm mt-1 font-medium" style={{ color: '#2C3E50' }}>
                    {orgInfo.name}
                  </p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: '#ADB5BD' }}>Niveau de licence</p>
                  <p className="text-sm mt-1 font-medium" style={{ color: '#C0392B' }}>
                    {orgInfo.licenseType === 'ESSAI_GRATUIT' ? 'Essai gratuit'
                      : orgInfo.licenseType === 'STANDARD' ? 'Standard'
                      : orgInfo.licenseType === 'ENTREPRISE' ? 'Entreprise'
                      : orgInfo.licenseType}
                  </p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: '#ADB5BD' }}>Membres de l'équipe</p>
                  <p className="text-sm mt-1 font-medium" style={{ color: '#2C3E50' }}>
                    {orgInfo.users?.length ?? orgInfo._count?.users ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: '#ADB5BD' }}>Projets actifs</p>
                  <p className="text-sm mt-1 font-medium" style={{ color: '#2C3E50' }}>
                    {orgInfo._count?.projects ?? '—'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* À propos */}
          <div className="rounded-md p-6"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E9ECEF',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}>
            <h3 className="font-semibold mb-3" style={{ color: '#2C3E50' }}>
              À propos de CORO
            </h3>
            <div className="space-y-2">
              {[
                { label: 'Version',          value: '1.0.0-MVP',   color: '#2C3E50' },
                { label: 'Environnement',    value: 'Local',       color: '#27AE60' },
                { label: 'Base de données',  value: 'PostgreSQL ✓', color: '#27AE60' },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-1"
                  style={{ borderBottom: '1px solid #F8F9FA' }}>
                  <span className="text-sm" style={{ color: '#6C757D' }}>{item.label}</span>
                  <span className="text-sm font-mono font-medium" style={{ color: item.color }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}