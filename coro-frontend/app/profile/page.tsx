'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';

export default function ProfilePage() {
  const router = useRouter();
  const { user, initAuth } = useAuthStore();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    horaireBase: 40,
  });
  const [companyForm, setCompanyForm] = useState({
    companyName: '',
    companyPhone: '',
    companyEmail: '',
    companyAddress: '',
    companyWebsite: '',
    companyTagline: '',
    companyLogoFullB64: '',
  });
  const [savingCompany, setSavingCompany] = useState(false);
  const [companySaved, setCompanySaved] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        horaireBase: (user as any).horaireBase || 40,
      });
      setCompanyForm({
        companyName: (user as any).companyName || '',
        companyPhone: (user as any).companyPhone || '',
        companyEmail: (user as any).companyEmail || '',
        companyAddress: (user as any).companyAddress || '',
        companyWebsite: (user as any).companyWebsite || '',
        companyTagline: (user as any).companyTagline || '',
        companyLogoFullB64: (user as any).companyLogoFullB64 || (user as any).companyLogoB64 || '',
      });
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/users/me', form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      initAuth();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleSaveCompany = async () => {
    setSavingCompany(true);
    try {
      const updated = await api.put('/users/me', companyForm);
      // Mettre à jour le localStorage avec les nouvelles données
      const currentUser = JSON.parse(localStorage.getItem('coro_user') || '{}');
      const updatedUser = { ...currentUser, ...updated.data };
      localStorage.setItem('coro_user', JSON.stringify(updatedUser));
      setCompanyForm({
        companyName: updated.data.companyName || '',
        companyPhone: updated.data.companyPhone || '',
        companyEmail: updated.data.companyEmail || '',
        companyAddress: updated.data.companyAddress || '',
        companyWebsite: updated.data.companyWebsite || '',
        companyTagline: updated.data.companyTagline || '',
        companyLogoFullB64: updated.data.companyLogoFullB64 || updated.data.companyLogoB64 || '',
      });
      setCompanySaved(true);
      setTimeout(() => setCompanySaved(false), 3000);
      initAuth(); // Recharger le user dans le store APRÈS avoir mis à jour le state
    } catch (err) { console.error(err); }
    finally { setSavingCompany(false); }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCompanyForm({ ...companyForm, companyLogoFullB64: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    setSavingPassword(true);
    try {
      await api.put('/users/me/password', { newPassword: passwordForm.newPassword });
      setPasswordSaved(true);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordSaved(false), 3000);
    } catch (err) { console.error(err); }
    finally { setSavingPassword(false); }
  };

  const inputCls = "w-full px-3 py-2.5 text-sm rounded focus:outline-none";
  const inputSty = { border: '1px solid #CED4DA', color: '#2C3E50', backgroundColor: '#FFFFFF' };

  if (!user) return null;

  return (
    <AppLayout>
      <div className="max-w-2xl">
        {/* En-tête */}
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#ADB5BD' }}>
            Compte
          </p>
          <h1 className="text-2xl font-black" style={{ color: '#2C3E50' }}>Mon profil</h1>
          <div className="h-1 w-16 mt-2" style={{ backgroundColor: '#C0392B' }} />
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6 p-5 rounded-md"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-black"
            style={{ backgroundColor: '#C0392B' }}>
            {user.firstName?.[0]}{user.lastName?.[0]}
          </div>
          <div>
            <p className="font-bold text-lg" style={{ color: '#2C3E50' }}>
              {user.firstName} {user.lastName}
            </p>
            <p className="text-sm" style={{ color: '#6C757D' }}>{user.email}</p>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block"
              style={{
                backgroundColor: user.role === 'SUPER_ADMIN' ? '#FDEDEC' : user.role === 'ADMIN' ? '#EBF5FB' : '#EAFAF1',
                color: user.role === 'SUPER_ADMIN' ? '#C0392B' : user.role === 'ADMIN' ? '#2980B9' : '#27AE60',
              }}>
              {user.role === 'SUPER_ADMIN' ? 'Super Admin' : user.role === 'ADMIN' ? 'Administrateur' : 'Conseiller'}
            </span>
          </div>
        </div>

        {/* Informations personnelles */}
        <div className="rounded-md p-6 mb-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
          <h2 className="font-semibold mb-4" style={{ color: '#2C3E50' }}>Informations personnelles</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>Prénom</label>
              <input type="text" value={form.firstName}
                onChange={e => setForm({ ...form, firstName: e.target.value })}
                className={inputCls} style={inputSty}
                onFocus={e => e.target.style.borderColor = '#C0392B'}
                onBlur={e => e.target.style.borderColor = '#CED4DA'} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>Nom</label>
              <input type="text" value={form.lastName}
                onChange={e => setForm({ ...form, lastName: e.target.value })}
                className={inputCls} style={inputSty}
                onFocus={e => e.target.style.borderColor = '#C0392B'}
                onBlur={e => e.target.style.borderColor = '#CED4DA'} />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>Courriel</label>
            <input type="email" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className={inputCls} style={inputSty}
              onFocus={e => e.target.style.borderColor = '#C0392B'}
              onBlur={e => e.target.style.borderColor = '#CED4DA'} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>
              Horaire de base
            </label>
            <div className="flex gap-3">
              {[
                { value: 37.5, label: '37.5h / semaine', desc: 'Clause 37h30 (anciens employés)' },
                { value: 40, label: '40h / semaine', desc: 'Standard Garda' },
              ].map(opt => (
                <button key={opt.value}
                  onClick={() => setForm({ ...form, horaireBase: opt.value })}
                  className="flex-1 p-3 rounded text-left transition-colors"
                  style={{
                    backgroundColor: form.horaireBase === opt.value ? '#EBF5FB' : '#F8F9FA',
                    border: `1px solid ${form.horaireBase === opt.value ? '#2980B9' : '#DEE2E6'}`,
                  }}>
                  <p className="text-sm font-bold" style={{ color: form.horaireBase === opt.value ? '#2980B9' : '#2C3E50' }}>
                    {opt.label}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#ADB5BD' }}>{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleSave} disabled={saving}
            className="text-white text-sm font-medium px-4 py-2 rounded disabled:opacity-50"
            style={{ backgroundColor: saved ? '#27AE60' : '#C0392B' }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.backgroundColor = saved ? '#1E8449' : '#A93226'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = saved ? '#27AE60' : '#C0392B'; }}>
            {saving ? 'Sauvegarde...' : saved ? '✓ Sauvegardé' : 'Sauvegarder'}
          </button>
        </div>

        {/* Section Organisation émettrice */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '6px', border: '1px solid #E9ECEF', padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#2C3E50', marginBottom: '4px' }}>
            Organisation émettrice
          </h2>
          <p style={{ fontSize: '13px', color: '#6C757D', marginBottom: '20px' }}>
            Ces informations apparaissent sur la dernière page de vos documents exportés.
          </p>

          {/* Logo */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#2C3E50', display: 'block', marginBottom: '8px' }}>
              Logo de l'organisation
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {companyForm.companyLogoFullB64 ? (
                <img src={companyForm.companyLogoFullB64} alt="Logo" style={{ height: '48px', maxWidth: '160px', objectFit: 'contain', border: '1px solid #E9ECEF', borderRadius: '4px', padding: '4px' }} />
              ) : (
                <div style={{ height: '48px', width: '120px', backgroundColor: '#F8F9FA', border: '1px dashed #DEE2E6', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#ADB5BD' }}>Aucun logo</span>
                </div>
              )}
              <div>
                <input type="file" accept="image/*" id="logo-upload" style={{ display: 'none' }} onChange={handleLogoUpload} />
                <label htmlFor="logo-upload" style={{ cursor: 'pointer', padding: '8px 16px', backgroundColor: '#F8F9FA', border: '1px solid #DEE2E6', borderRadius: '4px', fontSize: '13px', color: '#2C3E50' }}>
                  {companyForm.companyLogoFullB64 ? 'Changer le logo' : 'Téléverser un logo'}
                </label>
                {companyForm.companyLogoFullB64 && (
                  <button onClick={() => setCompanyForm({ ...companyForm, companyLogoFullB64: '' })}
                    style={{ marginLeft: '8px', padding: '8px 12px', backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF', borderRadius: '4px', fontSize: '13px', color: '#C0392B', cursor: 'pointer' }}>
                    Retirer
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Champs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#2C3E50', display: 'block', marginBottom: '6px' }}>Nom de l'organisation</label>
              <input
                value={companyForm.companyName}
                onChange={e => setCompanyForm({ ...companyForm, companyName: e.target.value })}
                placeholder="Ex: CORO Inc."
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #DEE2E6', borderRadius: '4px', fontSize: '13px', color: '#2C3E50', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#2C3E50', display: 'block', marginBottom: '6px' }}>Slogan / Tagline</label>
              <input
                value={companyForm.companyTagline}
                onChange={e => setCompanyForm({ ...companyForm, companyTagline: e.target.value })}
                placeholder="Ex: Expert-conseil en résilience"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #DEE2E6', borderRadius: '4px', fontSize: '13px', color: '#2C3E50', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#2C3E50', display: 'block', marginBottom: '6px' }}>Téléphone</label>
              <input
                value={companyForm.companyPhone}
                onChange={e => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                  let formatted = digits;
                  if (digits.length >= 7) formatted = `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
                  else if (digits.length >= 4) formatted = `(${digits.slice(0,3)}) ${digits.slice(3)}`;
                  else if (digits.length >= 1) formatted = `(${digits}`;
                  setCompanyForm({ ...companyForm, companyPhone: formatted });
                }}
                placeholder="Ex: (514) 791-7871"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #DEE2E6', borderRadius: '4px', fontSize: '13px', color: '#2C3E50', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#2C3E50', display: 'block', marginBottom: '6px' }}>Courriel</label>
              <input
                value={companyForm.companyEmail}
                onChange={e => setCompanyForm({ ...companyForm, companyEmail: e.target.value })}
                placeholder="Ex: info@coroinc.com"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #DEE2E6', borderRadius: '4px', fontSize: '13px', color: '#2C3E50', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#2C3E50', display: 'block', marginBottom: '6px' }}>Site web</label>
              <input
                value={companyForm.companyWebsite}
                onChange={e => setCompanyForm({ ...companyForm, companyWebsite: e.target.value })}
                placeholder="Ex: www.coroinc.com"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #DEE2E6', borderRadius: '4px', fontSize: '13px', color: '#2C3E50', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#2C3E50', display: 'block', marginBottom: '6px' }}>Adresse</label>
              <input
                value={companyForm.companyAddress}
                onChange={e => setCompanyForm({ ...companyForm, companyAddress: e.target.value })}
                placeholder="Ex: 123 Rue Principale, Montréal, QC"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #DEE2E6', borderRadius: '4px', fontSize: '13px', color: '#2C3E50', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Bouton sauvegarder */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={handleSaveCompany}
              disabled={savingCompany}
              style={{ padding: '10px 24px', backgroundColor: '#C0392B', color: '#FFFFFF', border: 'none', borderRadius: '4px', fontSize: '14px', fontWeight: '600', cursor: savingCompany ? 'not-allowed' : 'pointer', opacity: savingCompany ? 0.7 : 1 }}
            >
              {savingCompany ? 'Sauvegarde...' : 'Sauvegarder l\'organisation'}
            </button>
            {companySaved && (
              <span style={{ fontSize: '13px', color: '#27AE60', fontWeight: '600' }}>✅ Sauvegardé !</span>
            )}
          </div>
        </div>

        {/* Changer le mot de passe */}
        <div className="rounded-md p-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
          <h2 className="font-semibold mb-4" style={{ color: '#2C3E50' }}>Changer le mot de passe</h2>
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>Nouveau mot de passe</label>
              <input type="password" value={passwordForm.newPassword}
                onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                placeholder="Minimum 8 caractères"
                className={inputCls} style={inputSty}
                onFocus={e => e.target.style.borderColor = '#C0392B'}
                onBlur={e => e.target.style.borderColor = '#CED4DA'} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>Confirmer le mot de passe</label>
              <input type="password" value={passwordForm.confirmPassword}
                onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                placeholder="Répéter le nouveau mot de passe"
                className={inputCls} style={inputSty}
                onFocus={e => e.target.style.borderColor = '#C0392B'}
                onBlur={e => e.target.style.borderColor = '#CED4DA'} />
            </div>
          </div>
          {passwordError && (
            <p className="text-xs mb-3" style={{ color: '#C0392B' }}>{passwordError}</p>
          )}
          <button onClick={handleChangePassword} disabled={savingPassword || !passwordForm.newPassword}
            className="text-white text-sm font-medium px-4 py-2 rounded disabled:opacity-50"
            style={{ backgroundColor: passwordSaved ? '#27AE60' : '#2980B9' }}
            onMouseEnter={e => { if (!savingPassword) e.currentTarget.style.backgroundColor = passwordSaved ? '#1E8449' : '#1A5276'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = passwordSaved ? '#27AE60' : '#2980B9'; }}>
            {savingPassword ? 'Modification...' : passwordSaved ? '✓ Mot de passe modifié' : 'Changer le mot de passe'}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}