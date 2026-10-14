'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { toast } from '@/lib/toast';
import WorkScheduleEditorPanel from '@/components/WorkScheduleEditorPanel';
import { useTheme } from '@/design-system/theme/ThemeProvider';
import { createPalette } from '@/design-system/glass-palette';
import type { ThemePreference } from '@/design-system/theme/theme-core';

export default function ProfilePage() {
  const router = useRouter();
  const { user, initAuth } = useAuthStore();
  const { ui, uiPreference, preference, setUi, setPreference } = useTheme();
  const glass = ui === 'glass';
  const p = createPalette(glass);
  const gc = glass ? ' cg-glass' : '';

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    horaireBase: 40,
  });
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
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.put('/users/me', form);
      const currentUser = JSON.parse(localStorage.getItem('coro_user') || '{}');
      const updatedUser = { ...currentUser, ...updated.data };
      localStorage.setItem('coro_user', JSON.stringify(updatedUser));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      initAuth();
      toast('Profil sauvegardé avec succès.');
    } catch (err) {
      toast('Erreur lors de la sauvegarde du profil.', 'error');
    } finally { setSaving(false); }
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
    if (!/[A-Z]/.test(passwordForm.newPassword)) {
      setPasswordError('Le mot de passe doit contenir au moins une majuscule.');
      return;
    }
    if (!/[a-z]/.test(passwordForm.newPassword)) {
      setPasswordError('Le mot de passe doit contenir au moins une minuscule.');
      return;
    }
    if (!/[0-9]/.test(passwordForm.newPassword)) {
      setPasswordError('Le mot de passe doit contenir au moins un chiffre.');
      return;
    }
    if (!/[^A-Za-z0-9]/.test(passwordForm.newPassword)) {
      setPasswordError('Le mot de passe doit contenir au moins un caractère spécial (!@#$%^&*...).');
      return;
    }
    setSavingPassword(true);
    try {
      await api.put('/users/me/password', { newPassword: passwordForm.newPassword });
      setPasswordSaved(true);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordSaved(false), 3000);
      toast('Mot de passe modifié avec succès.');
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Une erreur est survenue. Veuillez réessayer.';
      setPasswordError(Array.isArray(message) ? message[0] : message);
      toast(Array.isArray(message) ? message[0] : message, 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  const inputCls = "w-full px-3 py-2.5 text-sm rounded focus:outline-none";
  const inputSty = { border: `1px solid ${p.line('#CED4DA')}`, color: p.text('#2C3E50'), backgroundColor: p.bg('#FFFFFF') };

  if (!user) return null;

  return (
    <AppLayout>
      <div className="max-w-3xl">
        {/* En-tête */}
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: p.text('#ADB5BD') }}>
            Compte
          </p>
          <h1 className="text-2xl font-black" style={{ color: p.text('#2C3E50') }}>Mon profil</h1>
          <div className="h-1 w-16 mt-2" style={{ backgroundColor: p.bg('#C0392B') }} />
        </div>

        {/* Avatar */}
        <div className={`flex flex-col sm:flex-row sm:items-center gap-4 mb-6 p-4 sm:p-5 rounded-md${gc}`}
          style={{ backgroundColor: p.bg('#FFFFFF'), border: `1px solid ${p.line('#E9ECEF')}` }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-black"
            style={{ backgroundColor: p.bg('#C0392B') }}>
            {user.firstName?.[0]}{user.lastName?.[0]}
          </div>
          <div className="min-w-0 text-center sm:text-left">
            <p className="font-bold text-lg break-words" style={{ color: p.text('#2C3E50') }}>
              {user.firstName} {user.lastName}
            </p>
            <p className="text-sm break-all" style={{ color: p.text('#6C757D') }}>{user.email}</p>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block"
              style={{
                backgroundColor: user.role === 'SUPER_ADMIN' ? p.bg('#FDEDEC') : user.role === 'ADMIN' ? p.bg('#EBF5FB') : p.bg('#EAFAF1'),
                color: user.role === 'SUPER_ADMIN' ? p.text('#C0392B') : user.role === 'ADMIN' ? p.text('#2980B9') : p.text('#27AE60'),
              }}>
              {user.role === 'SUPER_ADMIN' ? 'Super Admin' : user.role === 'ADMIN' ? 'Administrateur' : 'Conseiller'}
            </span>
          </div>
        </div>

        {/* Informations personnelles */}
        <div className={`rounded-md p-4 sm:p-6 mb-4${gc}`} style={{ backgroundColor: p.bg('#FFFFFF'), border: `1px solid ${p.line('#E9ECEF')}` }}>
          <h2 className="font-semibold mb-4" style={{ color: p.text('#2C3E50') }}>Informations personnelles</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: p.text('#6C757D') }}>Prénom</label>
              <input type="text" value={form.firstName}
                onChange={e => setForm({ ...form, firstName: e.target.value })}
                className={inputCls} style={inputSty}
                onFocus={e => e.target.style.borderColor = p.line('#C0392B')}
                onBlur={e => e.target.style.borderColor = p.line('#CED4DA')} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: p.text('#6C757D') }}>Nom</label>
              <input type="text" value={form.lastName}
                onChange={e => setForm({ ...form, lastName: e.target.value })}
                className={inputCls} style={inputSty}
                onFocus={e => e.target.style.borderColor = p.line('#C0392B')}
                onBlur={e => e.target.style.borderColor = p.line('#CED4DA')} />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: p.text('#6C757D') }}>Courriel</label>
            <input type="email" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className={inputCls} style={inputSty}
              onFocus={e => e.target.style.borderColor = p.line('#C0392B')}
              onBlur={e => e.target.style.borderColor = p.line('#CED4DA')} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: p.text('#6C757D') }}>
              Horaire de base
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              {[
                { value: 37.5, label: '37.5h / semaine', desc: 'Clause 37h30 (anciens employés)' },
                { value: 40, label: '40h / semaine', desc: 'Standard Garda' },
              ].map(opt => (
                <button key={opt.value}
                  onClick={() => setForm({ ...form, horaireBase: opt.value })}
                  className="flex-1 p-3 rounded text-left transition-colors min-w-0"
                  style={{
                    backgroundColor: form.horaireBase === opt.value ? p.bg('#EBF5FB') : p.bg('#F8F9FA'),
                    border: `1px solid ${form.horaireBase === opt.value ? p.line('#2980B9') : p.line('#DEE2E6')}`,
                  }}>
                  <p className="text-sm font-bold" style={{ color: form.horaireBase === opt.value ? p.text('#2980B9') : p.text('#2C3E50') }}>
                    {opt.label}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: p.text('#ADB5BD') }}>{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleSave} disabled={saving}
            className="w-full sm:w-auto text-white text-sm font-medium px-4 py-2 rounded disabled:opacity-50"
            style={{ backgroundColor: saved ? p.bg('#27AE60') : p.bg('#C0392B') }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.backgroundColor = saved ? p.bg('#1E8449') : p.bg('#A93226'); }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = saved ? p.bg('#27AE60') : p.bg('#C0392B'); }}>
            {saving ? 'Sauvegarde...' : saved ? '✓ Sauvegardé' : 'Sauvegarder'}
          </button>
        </div>

        <WorkScheduleEditorPanel manager={false} />

        {/* Apparence (prototype Liquid Glass — préférence propre à cet appareil) */}
        <div className={`rounded-md p-4 sm:p-6 mb-4${gc}`} style={{ backgroundColor: p.bg('#FFFFFF'), border: `1px solid ${p.line('#E9ECEF')}` }}>
          <h2 className="font-semibold mb-1" style={{ color: p.text('#2C3E50') }}>Apparence</h2>
          <p className="text-xs mb-4" style={{ color: p.text('#6C757D') }}>
            Aperçu du nouveau design Liquid Glass. Le mode Classique reste le mode par défaut ; ce choix est mémorisé sur cet appareil uniquement.
          </p>

          <p id="appearance-ui-label" className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: p.text('#6C757D') }}>Interface</p>
          <div role="radiogroup" aria-labelledby="appearance-ui-label" className="flex flex-col sm:flex-row gap-3 mb-4">
            {([
              { value: 'legacy', label: 'Classique', desc: 'Interface actuelle, inchangée' },
              { value: 'glass', label: 'Liquid Glass (aperçu)', desc: 'Nouveau design — tableau de bord et navigation' },
            ] as const).map(opt => {
              const selected = uiPreference === opt.value;
              return (
                <button key={opt.value} type="button" role="radio" aria-checked={selected}
                  onClick={() => setUi(opt.value)}
                  className="flex-1 p-3 rounded text-left transition-colors min-w-0"
                  style={{
                    backgroundColor: selected ? p.bg('#EBF5FB') : p.bg('#F8F9FA'),
                    border: `1px solid ${selected ? p.line('#2980B9') : p.line('#DEE2E6')}`,
                  }}>
                  <p className="text-sm font-bold" style={{ color: selected ? p.text('#2980B9') : p.text('#2C3E50') }}>{opt.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: p.text('#ADB5BD') }}>{opt.desc}</p>
                </button>
              );
            })}
          </div>

          <p id="appearance-theme-label" className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: p.text('#6C757D') }}>Thème (Liquid Glass)</p>
          <div role="radiogroup" aria-labelledby="appearance-theme-label" className="flex flex-col sm:flex-row gap-3">
            {([
              { value: 'LIGHT', label: 'Clair' },
              { value: 'DARK', label: 'Sombre' },
              { value: 'SYSTEM', label: 'Système' },
            ] as { value: ThemePreference; label: string }[]).map(opt => {
              const selected = preference === opt.value;
              return (
                <button key={opt.value} type="button" role="radio" aria-checked={selected} disabled={uiPreference !== 'glass'}
                  onClick={() => setPreference(opt.value)}
                  className="flex-1 p-3 rounded text-left transition-colors min-w-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: selected ? p.bg('#EBF5FB') : p.bg('#F8F9FA'),
                    border: `1px solid ${selected ? p.line('#2980B9') : p.line('#DEE2E6')}`,
                  }}>
                  <p className="text-sm font-bold" style={{ color: selected ? p.text('#2980B9') : p.text('#2C3E50') }}>{opt.label}</p>
                </button>
              );
            })}
          </div>
          {uiPreference !== 'glass' && (
            <p className="text-xs mt-2" style={{ color: p.text('#ADB5BD') }}>Le choix du thème s’active avec l’interface Liquid Glass.</p>
          )}
        </div>

        {/* Changer le mot de passe */}
        <div className={`rounded-md p-4 sm:p-6${gc}`} style={{ backgroundColor: p.bg('#FFFFFF'), border: `1px solid ${p.line('#E9ECEF')}` }}>
          <h2 className="font-semibold mb-4" style={{ color: p.text('#2C3E50') }}>Changer le mot de passe</h2>
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: p.text('#6C757D') }}>Nouveau mot de passe</label>
              <input type="password" value={passwordForm.newPassword}
                onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                placeholder="Minimum 8 caractères"
                className={inputCls} style={inputSty}
                onFocus={e => e.target.style.borderColor = p.line('#C0392B')}
                onBlur={e => e.target.style.borderColor = p.line('#CED4DA')} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: p.text('#6C757D') }}>Confirmer le mot de passe</label>
              <input type="password" value={passwordForm.confirmPassword}
                onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                placeholder="Répéter le nouveau mot de passe"
                className={inputCls} style={inputSty}
                onFocus={e => e.target.style.borderColor = p.line('#C0392B')}
                onBlur={e => e.target.style.borderColor = p.line('#CED4DA')} />
            </div>
          </div>
          {passwordError && (
            <p className="text-xs mb-3" style={{ color: p.text('#C0392B') }}>{passwordError}</p>
          )}
          <button onClick={handleChangePassword} disabled={savingPassword || !passwordForm.newPassword}
            className="w-full sm:w-auto text-white text-sm font-medium px-4 py-2 rounded disabled:opacity-50"
            style={{ backgroundColor: passwordSaved ? p.bg('#27AE60') : p.bg('#2980B9') }}
            onMouseEnter={e => { if (!savingPassword) e.currentTarget.style.backgroundColor = passwordSaved ? p.bg('#1E8449') : p.bg('#1A5276'); }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = passwordSaved ? p.bg('#27AE60') : p.bg('#2980B9'); }}>
            {savingPassword ? 'Modification...' : passwordSaved ? '✓ Mot de passe modifié' : 'Changer le mot de passe'}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
