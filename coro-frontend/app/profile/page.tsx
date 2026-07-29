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
      await api.put('/users/me', { password: passwordForm.newPassword });
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
          <button onClick={handleSave} disabled={saving}
            className="text-white text-sm font-medium px-4 py-2 rounded disabled:opacity-50"
            style={{ backgroundColor: saved ? '#27AE60' : '#C0392B' }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.backgroundColor = saved ? '#1E8449' : '#A93226'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = saved ? '#27AE60' : '#C0392B'; }}>
            {saving ? 'Sauvegarde...' : saved ? '✓ Sauvegardé' : 'Sauvegarder'}
          </button>
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