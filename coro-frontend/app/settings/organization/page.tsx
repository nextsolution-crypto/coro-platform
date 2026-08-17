'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { ArrowLeft, Save, Building2 } from 'lucide-react';

export default function OrganizationSettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, initAuth } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFullPreview, setLogoFullPreview] = useState<string | null>(null);
  const [orgInfo, setOrgInfo] = useState<any>(null);
  const [form, setForm] = useState({ companyName: '', companyPhone: '', companyEmail: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputFullRef = useRef<HTMLInputElement>(null);

  useEffect(() => { initAuth(); }, []);
  useEffect(() => {
    if (isAuthenticated) {
      if (!['ADMIN', 'SUPER_ADMIN'].includes(user?.role || '')) {
        router.push('/settings');
        return;
      }
      fetchData();
    }
  }, [isAuthenticated, user]);

  const fetchData = async () => {
    try {
      const res = await api.get('/users/me');
      setForm({
        companyName: res.data.companyName || '',
        companyPhone: res.data.companyPhone || '',
        companyEmail: res.data.companyEmail || '',
      });
      if (res.data.companyLogoB64) setLogoPreview(res.data.companyLogoB64);
      if (res.data.companyLogoFullB64) setLogoFullPreview(res.data.companyLogoFullB64);
      const orgRes = await api.get('/organizations/me/info').catch(() => ({ data: null }));
      setOrgInfo(orgRes.data);
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

  const inputStyle = { border: '1px solid #CED4DA', color: '#2C3E50', backgroundColor: '#FFFFFF' };

  if (loading) return <AppLayout><div className="flex items-center justify-center py-24"><p className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>Chargement...</p></div></AppLayout>;

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <button onClick={() => router.push('/settings')}
            className="flex items-center gap-2 text-sm mb-3 transition-colors" style={{ color: '#6C757D' }}
            onMouseEnter={e => e.currentTarget.style.color = '#2C3E50'}
            onMouseLeave={e => e.currentTarget.style.color = '#6C757D'}>
            <ArrowLeft size={16} /> Retour aux paramètres
          </button>
          <h2 className="text-2xl font-semibold" style={{ color: '#2C3E50' }}>Organisation</h2>
          <p className="text-sm mt-1" style={{ color: '#6C757D' }}>Informations et branding de votre organisation</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 text-white text-sm font-medium px-5 py-2.5 rounded"
          style={{ backgroundColor: saved ? '#27AE60' : '#C0392B' }}
          onMouseEnter={e => { if (!saved) e.currentTarget.style.backgroundColor = '#A93226'; }}
          onMouseLeave={e => { if (!saved) e.currentTarget.style.backgroundColor = '#C0392B'; }}>
          <Save size={15} />
          {saving ? 'Sauvegarde...' : saved ? '✓ Sauvegardé !' : 'Sauvegarder'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Logos */}
        <div className="space-y-6">
          <div className="rounded-md p-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
            <h3 className="font-semibold mb-1" style={{ color: '#2C3E50' }}>Logo icône</h3>
            <p className="text-xs mb-4" style={{ color: '#ADB5BD' }}>Apparaît sur les documents générés</p>
            <div className="flex flex-col items-center gap-4">
              {logoPreview ? (
                <div className="relative">
                  <div className="w-32 h-32 rounded-md overflow-hidden flex items-center justify-center bg-white" style={{ border: '1px solid #E9ECEF' }}>
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-2" />
                  </div>
                  <button onClick={async () => { setLogoPreview(null); await api.put('/users/me/logo', { companyLogoB64: null }); }}
                    className="absolute -top-2 -right-2 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                    style={{ backgroundColor: '#C0392B' }}>✕</button>
                </div>
              ) : (
                <div onClick={() => fileInputRef.current?.click()}
                  className="w-32 h-32 rounded-md flex flex-col items-center justify-center cursor-pointer"
                  style={{ border: '2px dashed #CED4DA', backgroundColor: '#F8F9FA' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#C0392B'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#CED4DA'}>
                  <span className="text-3xl mb-2">🏢</span>
                  <span className="text-xs text-center" style={{ color: '#ADB5BD' }}>Cliquer pour ajouter</span>
                </div>
              )}
              <button onClick={() => fileInputRef.current?.click()}
                className="w-full text-sm py-2 rounded font-medium"
                style={{ border: '1px solid #DEE2E6', color: '#6C757D', backgroundColor: '#F8F9FA' }}>
                {logoPreview ? 'Changer' : 'Ajouter'}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            </div>
          </div>

          <div className="rounded-md p-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
            <h3 className="font-semibold mb-1" style={{ color: '#2C3E50' }}>Logo complet</h3>
            <p className="text-xs mb-4" style={{ color: '#ADB5BD' }}>Icône + nom — page de couverture des documents</p>
            <div className="flex flex-col items-center gap-4">
              {logoFullPreview ? (
                <div className="relative w-full">
                  <div className="w-full h-20 rounded-md overflow-hidden flex items-center justify-center bg-white" style={{ border: '1px solid #E9ECEF' }}>
                    <img src={logoFullPreview} alt="Logo complet" className="max-w-full max-h-full object-contain p-2" />
                  </div>
                  <button onClick={async () => { setLogoFullPreview(null); await api.put('/users/me/logo-full', { companyLogoFullB64: null }); }}
                    className="absolute -top-2 -right-2 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                    style={{ backgroundColor: '#C0392B' }}>✕</button>
                </div>
              ) : (
                <div onClick={() => fileInputFullRef.current?.click()}
                  className="w-full h-20 rounded-md flex flex-col items-center justify-center cursor-pointer"
                  style={{ border: '2px dashed #CED4DA', backgroundColor: '#F8F9FA' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#C0392B'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#CED4DA'}>
                  <span className="text-xs" style={{ color: '#ADB5BD' }}>Cliquer pour ajouter</span>
                </div>
              )}
              <button onClick={() => fileInputFullRef.current?.click()}
                className="w-full text-sm py-2 rounded font-medium"
                style={{ border: '1px solid #DEE2E6', color: '#6C757D', backgroundColor: '#F8F9FA' }}>
                {logoFullPreview ? 'Changer' : 'Ajouter'}
              </button>
              <input ref={fileInputFullRef} type="file" accept="image/*" onChange={handleLogoFullUpload} className="hidden" />
            </div>
          </div>
        </div>

        {/* Infos organisation */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-md p-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
            <h3 className="font-semibold mb-4" style={{ color: '#2C3E50' }}>Informations entreprise</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>Nom de l'entreprise</label>
                <input type="text" value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })}
                  className="w-full rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>Téléphone</label>
                  <input type="text" value={form.companyPhone} onChange={e => setForm({ ...form, companyPhone: e.target.value })}
                    placeholder="514-555-1234"
                    className="w-full rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#C0392B'}
                    onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>Courriel</label>
                  <input type="email" value={form.companyEmail} onChange={e => setForm({ ...form, companyEmail: e.target.value })}
                    placeholder="info@organisation.ca"
                    className="w-full rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#C0392B'}
                    onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                </div>
              </div>
            </div>
          </div>

          {/* Infos licence */}
          {orgInfo && (
            <div className="rounded-md p-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
              <h3 className="font-semibold mb-4" style={{ color: '#2C3E50' }}>Licence CORO</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Organisation', value: orgInfo.name },
                  { label: 'Licence', value: orgInfo.licenseType === 'ESSAI_GRATUIT' ? 'Essai gratuit' : orgInfo.licenseType === 'STANDARD' ? 'Standard' : 'Entreprise' },
                  { label: 'Membres', value: orgInfo.users?.length ?? orgInfo._count?.users ?? '—' },
                  { label: 'Projets', value: orgInfo._count?.projects ?? '—' },
                ].map(item => (
                  <div key={item.label}>
                    <p className="text-xs" style={{ color: '#ADB5BD' }}>{item.label}</p>
                    <p className="text-sm font-semibold mt-1" style={{ color: '#2C3E50' }}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Raccourcis */}
          <div className="rounded-md p-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
            <h3 className="font-semibold mb-4" style={{ color: '#2C3E50' }}>Personnalisation documentaire</h3>
            <button onClick={() => router.push('/settings/module1-template')}
              className="flex items-center justify-between w-full px-4 py-3 rounded text-sm font-medium transition-colors"
              style={{ border: '1px solid #E9ECEF', color: '#2C3E50', backgroundColor: '#F8F9FA' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#C0392B'; e.currentTarget.style.color = '#C0392B'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#E9ECEF'; e.currentTarget.style.color = '#2C3E50'; }}>
              <span>📄 Modèle Module 1 — Introduction</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}